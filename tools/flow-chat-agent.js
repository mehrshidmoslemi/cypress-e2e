#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const readline = require("readline");
const { spawn } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");

function loadLocalEnvFile() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnvFile();

const FLOW_AGENT_PATH = path.join(__dirname, "flow-agent.js");
const CHAT_SPECS = {
  VS: "cypress/e2e/chat-vs-dynamic.cy.js",
  IR: "cypress/e2e/chat-ir-dynamic.cy.js",
  IE: "cypress/e2e/chat-ie-dynamic.cy.js",
  UC: "cypress/e2e/chat-uc-dynamic.cy.js",
  D2D: "cypress/e2e/chat-d2d-dynamic.cy.js",
};
const REPORT_DIR = path.join(ROOT_DIR, ".chat-agent-reports");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const AI_MODEL = process.env.CHAT_AGENT_AI_MODEL || "gpt-4o-mini";

const SERVICE_MAP = [
  { code: "VS", keywords: ["virtual staging", "vs", "ویژوال استیجینگ", "استیجینگ"] },
  { code: "IR", keywords: ["item removal", "remove item", "ir", "آیتم ریموال", "حذف آیتم"] },
  { code: "IE", keywords: ["image enhancement", "enhancement", "ie", "بهبود تصویر"] },
  { code: "D2D", keywords: ["day to dusk", "d2d", "دی تو داسک", "روز به غروب"] },
  { code: "UC", keywords: ["under construction", "uc", "زیرساخت", "آندر کانستراکشن"] },
  { code: "BC", keywords: ["backsplash", "bc", "بک اسپلش"] },
  { code: "CC", keywords: ["ceiling", "cc", "سقف"] },
  { code: "WC", keywords: ["wall change", "wc", "دیوار"] },
  { code: "FC", keywords: ["floor change", "fc", "کف"] },
  { code: "FR", keywords: ["furniture restyle", "fr", "مبلمان"] },
  { code: "ID", keywords: ["interior design", "id", "طراحی داخلی"] },
];

const VS_STYLE_MAP = {
  prime: ["prime", "پرایم", "بدون استایل"],
  modern: ["modern", "مدرن"],
  hampton: ["hampton", "همپتون"],
  contemporary: ["contemporary", "کانتمپرری", "معاصر"],
  scandinavian: ["scandinavian", "اسکاندیناوی"],
};

const VS_SPACE_MAP = {
  studio: ["studio", "استودیو"],
  "living-room": ["living room", "living-room", "نشیمن", "living"],
  bedroom: ["bedroom", "اتاق خواب"],
  outdoor: ["outdoor", "بیرونی", "فضای باز"],
  "dining-room": ["dining room", "dining-room", "ناهارخوری"],
};

const UC_STYLE_MAP = {
  contemporary: ["contemporary", "کانتمپرری", "معاصر"],
  hampton: ["hampton", "همپتون"],
  modern: ["modern", "مدرن"],
};

const UC_SPACE_MAP = {
  "living-room": ["living room", "living-room", "نشیمن", "living"],
  outdoor: ["outdoor", "بیرونی", "فضای باز"],
  bedroom: ["bedroom", "اتاق خواب"],
};

const state = {
  currentFlow: null,
  dryRun: false,
  lastExecution: null,
  lastUserInput: "",
  aiEnabled: true,
};

function normalize(text) {
  return String(text || "").trim().toLowerCase();
}

function hasAny(text, phrases) {
  return phrases.some((p) => text.includes(p));
}

function detectService(text) {
  for (const item of SERVICE_MAP) {
    if (hasAny(text, item.keywords)) return item.code;
  }
  return null;
}

function detectScenarioIds(text) {
  const matches = [...text.matchAll(/(?:scenario|سناریو|s)\s*[-:]?\s*(\d{1,2})/g)];
  const ids = matches
    .map((m) => Number.parseInt(m[1], 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)];
}

function extractBrowser(text) {
  const browserMatch = text.match(/--browser\s+([a-z0-9_-]+)/i);
  if (browserMatch) return browserMatch[1];
  if (text.includes("chrome")) return "chrome";
  if (text.includes("edge")) return "edge";
  if (text.includes("firefox")) return "firefox";
  return null;
}

function detectUploadPath(rawInput, fallbackPath) {
  const quoted = rawInput.match(/(?:upload|آپلود)\s+["']([^"']+)["']/i);
  if (quoted) return quoted[1].trim();

  const unquoted = rawInput.match(/(?:upload|آپلود)\s+([^\n\r]+)/i);
  if (unquoted) {
    const candidate = unquoted[1].trim();
    if (!hasAny(candidate.toLowerCase(), ["generate", "run", "دانلود", "download"])) {
      return candidate;
    }
  }
  return fallbackPath;
}

function detectVsStyle(text) {
  for (const [style, keywords] of Object.entries(VS_STYLE_MAP)) {
    if (hasAny(text, keywords)) return style;
  }
  return "prime";
}

function detectVsSpace(text) {
  for (const [space, keywords] of Object.entries(VS_SPACE_MAP)) {
    if (hasAny(text, keywords)) return space;
  }
  return "studio";
}

function detectUcStyle(text) {
  for (const [style, keywords] of Object.entries(UC_STYLE_MAP)) {
    if (hasAny(text, keywords)) return style;
  }
  return "contemporary";
}

function detectUcSpace(text) {
  for (const [space, keywords] of Object.entries(UC_SPACE_MAP)) {
    if (hasAny(text, keywords)) return space;
  }
  return "living-room";
}

function detectRetryCount(text) {
  const m = text.match(/(?:retry|ریتری)\s+(\d+)/i);
  if (!m) return 0;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isInteger(n) || n < 0) return 0;
  return Math.min(n, 5);
}

function detectDownloadMode(text) {
  if (hasAny(text, ["download none", "no download", "بدون دانلود"])) return "none";
  if (hasAny(text, ["download both", "both", "هر دو", "هردو"])) return "both";
  if (hasAny(text, ["upscale", "اپ‌اسکیل", "آپ اسکیل"])) return "upscale";
  if (hasAny(text, ["download", "دانلود", "normal", "نرمال"])) return "normal";
  return "none";
}

function parseVsActions(text, rawInput) {
  return {
    image: detectUploadPath(rawInput, "cypress/fixtures/images/vs-test-room.jpg"),
    space: detectVsSpace(text),
    style: detectVsStyle(text),
    removeFurniture: hasAny(text, ["remove furniture", "حذف مبلمان"]),
    download: hasAny(text, ["generate only", "فقط جنریت"]) ? "none" : detectDownloadMode(text),
    feedback: hasAny(text, ["feedback", "فیدبک"]),
    bookmark: hasAny(text, ["bookmark", "بوکمارک", "نشانک"]),
  };
}

function parseIrActions(text, rawInput) {
  return {
    image: detectUploadPath(rawInput, "cypress/fixtures/images/IR-test.jpg"),
    download: hasAny(text, ["generate only", "فقط جنریت"]) ? "none" : detectDownloadMode(text),
    feedback: hasAny(text, ["feedback", "فیدبک"]),
    bookmark: hasAny(text, ["bookmark", "بوکمارک", "نشانک"]),
  };
}

function parseIeActions(text, rawInput) {
  return {
    image: detectUploadPath(rawInput, "cypress/fixtures/images/IE-indoor-test.jpg"),
    variant: hasAny(text, ["outdoor", "بیرونی", "فضای باز"]) ? "outdoor" : "indoor",
    download: hasAny(text, ["generate only", "فقط جنریت"]) ? "none" : "normal",
    feedback: hasAny(text, ["feedback", "فیدبک"]),
    bookmark: hasAny(text, ["bookmark", "بوکمارک", "نشانک"]),
  };
}

function parseUcActions(text, rawInput) {
  return {
    image: detectUploadPath(rawInput, "cypress/fixtures/images/UC-test.jpg"),
    space: detectUcSpace(text),
    style: detectUcStyle(text),
    download: hasAny(text, ["generate only", "فقط جنریت"]) ? "none" : detectDownloadMode(text),
    feedback: hasAny(text, ["feedback", "فیدبک"]),
    bookmark: hasAny(text, ["bookmark", "بوکمارک", "نشانک"]),
  };
}

function parseD2dActions(text, rawInput) {
  return {
    image: detectUploadPath(rawInput, "cypress/fixtures/images/D2D-test.png"),
    sky: hasAny(text, ["sunset", "سانست"]) ? "sunset" : "twilight",
    download: hasAny(text, ["generate only", "فقط جنریت"]) ? "none" : "normal",
    feedback: hasAny(text, ["feedback", "فیدبک"]),
    bookmark: hasAny(text, ["bookmark", "بوکمارک", "نشانک"]),
  };
}

function buildChatOptions(text) {
  return {
    headed: hasAny(text, ["headed", "ui mode", "با ui", "با رابط"]),
    raw: hasAny(text, ["raw", "غیراپتیمایز", "نسخه خام"]),
    browser: extractBrowser(text),
    retries: detectRetryCount(text),
  };
}

function parseIntentRuleBased(rawInput) {
  const text = normalize(rawInput);
  const service = detectService(text);
  const scenarioIds = detectScenarioIds(text);
  const options = buildChatOptions(text);
  const includesRunAction = hasAny(text, [
    "generate",
    "gen",
    "run",
    "start",
    "test",
    "check",
    "try",
    "validate",
    "اجرا",
    "ران",
    "جنریت",
    "بزن",
    "تست",
    "امتحان",
    "بررسی",
  ]);

  if (hasAny(text, ["help", "راهنما", "کمک"])) return { type: "help" };
  if (hasAny(text, ["exit", "quit", "خروج"])) return { type: "exit" };
  if (hasAny(text, ["status", "وضعیت"])) return { type: "status" };
  if (hasAny(text, ["ai on", "هوش مصنوعی روشن"])) return { type: "ai_mode", enabled: true };
  if (hasAny(text, ["ai off", "هوش مصنوعی خاموش"])) return { type: "ai_mode", enabled: false };
  if (hasAny(text, ["last", "آخرین"])) return { type: "last_execution" };
  if (hasAny(text, ["dry run on", "activate dry run", "درای ران روشن"])) return { type: "dry_run", enabled: true };
  if (hasAny(text, ["dry run off", "deactivate dry run", "درای ران خاموش"])) return { type: "dry_run", enabled: false };
  if (hasAny(text, ["list scenarios", "سناریوها", "لیست سناریو"])) return { type: "list_scenarios" };
  if (hasAny(text, ["list flows", "فلوها", "لیست فلو"])) return { type: "list_flows" };
  if (hasAny(text, ["smoke"])) return { type: "run_group", group: "smoke", options };
  if (hasAny(text, ["run all", "all flows", "همه فلوها", "همه"])) return { type: "run_group", group: "all", options };

  if (scenarioIds.length > 0 && includesRunAction) {
    return { type: "run_scenario", scenarioIds, options };
  }

  const includesSetServiceOnly = hasAny(text, ["برو سرویس", "go to", "set service", "select service"]);

  if (service === "VS" && includesRunAction) {
    return { type: "run_dynamic", flow: "VS", options, cfg: parseVsActions(text, rawInput) };
  }
  if (service === "IR" && includesRunAction) {
    return { type: "run_dynamic", flow: "IR", options, cfg: parseIrActions(text, rawInput) };
  }
  if (service === "IE" && includesRunAction) {
    return { type: "run_dynamic", flow: "IE", options, cfg: parseIeActions(text, rawInput) };
  }
  if (service === "UC" && includesRunAction) {
    return { type: "run_dynamic", flow: "UC", options, cfg: parseUcActions(text, rawInput) };
  }
  if (service === "D2D" && includesRunAction) {
    return { type: "run_dynamic", flow: "D2D", options, cfg: parseD2dActions(text, rawInput) };
  }

  if (service && includesRunAction) return { type: "run_flow", flow: service, options };
  if (service && includesSetServiceOnly) return { type: "set_flow", flow: service };

  if (includesRunAction && state.currentFlow) {
    if (CHAT_SPECS[state.currentFlow]) {
      const cfg =
        state.currentFlow === "VS"
          ? parseVsActions(text, rawInput)
          : state.currentFlow === "IR"
            ? parseIrActions(text, rawInput)
            : state.currentFlow === "IE"
              ? parseIeActions(text, rawInput)
              : state.currentFlow === "UC"
                ? parseUcActions(text, rawInput)
                : parseD2dActions(text, rawInput);
      return { type: "run_dynamic", flow: state.currentFlow, options, cfg };
    }
    return { type: "run_flow", flow: state.currentFlow, options };
  }

  return { type: "unknown" };
}

function extractJsonFromModelContent(content) {
  const trimmed = String(content || "").trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function sanitizeIntent(intent) {
  if (!intent || typeof intent !== "object") return null;
  if (typeof intent.type !== "string") return null;

  const sanitized = {
    type: intent.type,
    flow: typeof intent.flow === "string" ? intent.flow.toUpperCase() : undefined,
    group: typeof intent.group === "string" ? intent.group.toLowerCase() : undefined,
    scenarioIds: Array.isArray(intent.scenarioIds)
      ? intent.scenarioIds.map((n) => Number.parseInt(n, 10)).filter((n) => Number.isInteger(n) && n > 0)
      : undefined,
    options: {
      headed: Boolean(intent.options && intent.options.headed),
      raw: Boolean(intent.options && intent.options.raw),
      browser:
        intent.options && typeof intent.options.browser === "string" ? intent.options.browser : null,
      retries:
        intent.options && Number.isInteger(intent.options.retries)
          ? Math.max(0, Math.min(5, intent.options.retries))
          : 0,
    },
    enabled: typeof intent.enabled === "boolean" ? intent.enabled : undefined,
    cfg: intent.cfg && typeof intent.cfg === "object" ? intent.cfg : undefined,
  };

  return sanitized;
}

async function parseIntentWithAI(rawInput) {
  if (!OPENAI_API_KEY || !state.aiEnabled) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  const system = `You are an intent parser for a QA test automation chat agent.
Return ONLY JSON object, no markdown.
Valid "type":
help|exit|status|last_execution|dry_run|ai_mode|list_scenarios|list_flows|run_group|run_scenario|set_flow|run_flow|run_dynamic|unknown
Valid flow values:
VS|IR|IE|UC|D2D|BC|CC|WC|FC|FR|ID
For run_dynamic flow may be only VS|IR|IE|UC|D2D.
If user asks to enable/disable AI, use type=ai_mode and enabled true/false.
If user asks dry run on/off, use type=dry_run and enabled true/false.
Fill options with headed/raw/browser/retries (0..5) when relevant.
For run_dynamic cfg keys:
- VS: image, space, style, removeFurniture, download, feedback, bookmark
- IR: image, download, feedback, bookmark
- IE: image, variant, download, feedback, bookmark
- UC: image, space, style, download, feedback, bookmark
- D2D: image, sky, download, feedback, bookmark
Be tolerant to Persian/English conversational text and infer user intent.
Examples:
- "test virtual staging service" => {"type":"run_dynamic","flow":"VS","options":{"headed":false,"raw":false,"browser":null,"retries":0},"cfg":{}}
- "سرویس item removal رو تست کن" => {"type":"run_dynamic","flow":"IR",...}`;

  const user = `Current state:
${JSON.stringify({ currentFlow: state.currentFlow, dryRun: state.dryRun })}

User message:
${rawInput}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      if (process.env.CHAT_AGENT_DEBUG === "1") {
        const errBody = await res.text();
        console.error(`AI parser HTTP ${res.status}: ${errBody.slice(0, 300)}`);
      }
      return null;
    }
    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";
    const parsed = extractJsonFromModelContent(content);
    if (!parsed) return null;
    return sanitizeIntent(parsed);
  } catch (err) {
    clearTimeout(timeout);
    if (process.env.CHAT_AGENT_DEBUG === "1") {
      console.error(`AI parser error: ${err.message}`);
    }
    return null;
  }
}

async function resolveIntent(rawInput) {
  const ruleIntent = parseIntentRuleBased(rawInput);
  if (ruleIntent.type !== "unknown") return ruleIntent;

  const aiIntent = await parseIntentWithAI(rawInput);
  if (aiIntent && aiIntent.type && aiIntent.type !== "unknown") {
    return aiIntent;
  }
  return ruleIntent;
}

function buildRunOptions(options) {
  const args = [];
  if (options.raw) args.push("--raw");
  if (options.headed) args.push("--headed");
  if (options.browser) args.push("--browser", options.browser);
  return args;
}

function runNode(args) {
  return new Promise((resolve) => {
    const child = spawn("node", [FLOW_AGENT_PATH, ...args], {
      cwd: ROOT_DIR,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => resolve(code || 0));
    child.on("error", () => resolve(1));
  });
}

function runCypressSpec(spec, options, cypressEnv) {
  return new Promise((resolve) => {
    const args = ["cypress", "run", "--spec", spec];
    if (options.headed) args.push("--headed");
    if (options.browser) args.push("--browser", options.browser);

    const maxMs = Number(process.env.CHAT_CYPRESS_TIMEOUT_MS || 600000);
    const startedAt = Date.now();
    console.log(
      `Cypress started. AI generation can take 2-6 minutes. Hard timeout: ${Math.round(maxMs / 1000)}s`,
    );

    const child = spawn("npx", args, {
      cwd: ROOT_DIR,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        ...cypressEnv,
        CYPRESS_CHAT_GEN_TIMEOUT_MS: process.env.CHAT_GEN_TIMEOUT_MS || "120000",
      },
    });

    const heartbeat = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[Cypress still running... ${elapsed}s elapsed]`);
    }, 30000);

    const killer = setTimeout(() => {
      console.error(`Cypress exceeded ${Math.round(maxMs / 1000)}s. Stopping run...`);
      child.kill("SIGTERM");
    }, maxMs);

    child.on("exit", (code) => {
      clearInterval(heartbeat);
      clearTimeout(killer);
      resolve(code === null ? 1 : code);
    });
    child.on("error", () => {
      clearInterval(heartbeat);
      clearTimeout(killer);
      resolve(1);
    });
  });
}

function mapDynamicEnv(flow, cfg) {
  if (flow === "VS") {
    return {
      CYPRESS_CHAT_VS_IMAGE: cfg.image,
      CYPRESS_CHAT_VS_SPACE: cfg.space,
      CYPRESS_CHAT_VS_STYLE: cfg.style,
      CYPRESS_CHAT_VS_REMOVE_FURNITURE: String(Boolean(cfg.removeFurniture)),
      CYPRESS_CHAT_VS_DOWNLOAD: cfg.download,
      CYPRESS_CHAT_VS_FEEDBACK: String(Boolean(cfg.feedback)),
      CYPRESS_CHAT_VS_BOOKMARK: String(Boolean(cfg.bookmark)),
    };
  }
  if (flow === "IR") {
    return {
      CYPRESS_CHAT_IR_IMAGE: cfg.image,
      CYPRESS_CHAT_IR_DOWNLOAD: cfg.download,
      CYPRESS_CHAT_IR_FEEDBACK: String(Boolean(cfg.feedback)),
      CYPRESS_CHAT_IR_BOOKMARK: String(Boolean(cfg.bookmark)),
    };
  }
  if (flow === "IE") {
    return {
      CYPRESS_CHAT_IE_IMAGE: cfg.image,
      CYPRESS_CHAT_IE_VARIANT: cfg.variant,
      CYPRESS_CHAT_IE_DOWNLOAD: cfg.download,
      CYPRESS_CHAT_IE_FEEDBACK: String(Boolean(cfg.feedback)),
      CYPRESS_CHAT_IE_BOOKMARK: String(Boolean(cfg.bookmark)),
    };
  }
  if (flow === "UC") {
    return {
      CYPRESS_CHAT_UC_IMAGE: cfg.image,
      CYPRESS_CHAT_UC_SPACE: cfg.space,
      CYPRESS_CHAT_UC_STYLE: cfg.style,
      CYPRESS_CHAT_UC_DOWNLOAD: cfg.download,
      CYPRESS_CHAT_UC_FEEDBACK: String(Boolean(cfg.feedback)),
      CYPRESS_CHAT_UC_BOOKMARK: String(Boolean(cfg.bookmark)),
    };
  }
  return {
    CYPRESS_CHAT_D2D_IMAGE: cfg.image,
    CYPRESS_CHAT_D2D_SKY: cfg.sky,
    CYPRESS_CHAT_D2D_DOWNLOAD: cfg.download,
    CYPRESS_CHAT_D2D_FEEDBACK: String(Boolean(cfg.feedback)),
    CYPRESS_CHAT_D2D_BOOKMARK: String(Boolean(cfg.bookmark)),
  };
}

function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

function writeExecutionReport(reportData) {
  ensureReportDir();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `chat-report-${ts}.json`;
  const fullPath = path.join(REPORT_DIR, fileName);
  fs.writeFileSync(fullPath, `${JSON.stringify(reportData, null, 2)}\n`, "utf8");
  return fullPath;
}

function printStatus() {
  console.log(`Current service: ${state.currentFlow || "not set"}`);
  console.log(`Dry run: ${state.dryRun ? "ON" : "OFF"}`);
  console.log(`AI intent parsing: ${state.aiEnabled ? "ON" : "OFF"} (${OPENAI_API_KEY ? "configured" : "no OPENAI_API_KEY"})`);
  if (state.lastExecution && state.lastExecution.reportPath) {
    console.log(`Last report: ${state.lastExecution.reportPath}`);
  }
}

function printLastExecution() {
  if (!state.lastExecution) {
    console.log("No execution yet.");
    return;
  }
  console.log(`Last execution: ${JSON.stringify(state.lastExecution, null, 2)}`);
}

async function executeOrDryRun(kind, commandInfo, runner) {
  const startedAt = new Date();
  state.lastExecution = { kind, ...commandInfo, at: startedAt.toISOString() };
  if (state.dryRun) {
    console.log(`[DRY RUN] ${kind}`);
    console.log(JSON.stringify(commandInfo, null, 2));
    const reportPath = writeExecutionReport({
      status: "dry-run",
      kind,
      startedAt: startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 0,
      commandInfo,
    });
    state.lastExecution.reportPath = reportPath;
    console.log(`Report: ${reportPath}`);
    return;
  }
  let finalExitCode = 1;
  const attempts = (commandInfo.options && Number(commandInfo.options.retries)) || 0;
  const maxAttempts = 1 + Math.max(0, attempts);
  let attempt = 0;
  const errors = [];
  while (attempt < maxAttempts) {
    attempt += 1;
    finalExitCode = await runner();
    if (finalExitCode === 0) break;
    errors.push(`Attempt ${attempt} failed with exit code ${finalExitCode}`);
    if (attempt < maxAttempts) {
      console.log(`Retrying ${kind} (${attempt}/${maxAttempts - 1} retries used)...`);
    }
  }
  const endedAt = new Date();
  const reportPath = writeExecutionReport({
    status: finalExitCode === 0 ? "passed" : "failed",
    kind,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    exitCode: finalExitCode,
    attempts: maxAttempts,
    errors,
    commandInfo,
  });
  state.lastExecution = {
    ...state.lastExecution,
    exitCode: finalExitCode,
    attempts: maxAttempts,
    reportPath,
  };
  console.log(`Report: ${reportPath}`);
}

function printHelp() {
  console.log(`
Chat examples:
  - برو سرویس virtual staging و جنریت کن
  - run virtual staging upload "cypress/fixtures/images/vs-test-room.jpg" style hampton living room generate download normal
  - run item removal upload "cypress/fixtures/images/IR-test.jpg" generate download both feedback
  - run image enhancement upload "cypress/fixtures/images/IE-indoor-test.jpg" outdoor generate download normal
  - run under construction upload "cypress/fixtures/images/UC-test.jpg" living room style hampton generate download normal
  - run day to dusk upload "cypress/fixtures/images/D2D-test.png" sunset generate download normal
  - سناریو 9 رو اجرا کن
  - dry run on
  - ai on / ai off
  - dry run run virtual staging style modern living room generate
  - run virtual staging ... retry 2
  - status
  - last
  - exit
`);
}

async function handleIntent(intent) {
  switch (intent.type) {
    case "help":
      printHelp();
      return true;
    case "exit":
      return false;
    case "status":
      printStatus();
      return true;
    case "last_execution":
      printLastExecution();
      return true;
    case "dry_run":
      state.dryRun = intent.enabled;
      console.log(`Dry run is now ${state.dryRun ? "ON" : "OFF"}.`);
      return true;
    case "ai_mode":
      state.aiEnabled = intent.enabled;
      console.log(`AI intent parsing is now ${state.aiEnabled ? "ON" : "OFF"}.`);
      return true;
    case "list_flows":
      await executeOrDryRun("list_flows", {}, () => runNode(["list"]));
      return true;
    case "list_scenarios":
      await executeOrDryRun("list_scenarios", {}, () => runNode(["scenarios"]));
      return true;
    case "run_group":
      await executeOrDryRun(
        "run_group",
        { group: intent.group, options: intent.options },
        () => runNode(["run", "--group", intent.group, ...buildRunOptions(intent.options)]),
      );
      return true;
    case "run_scenario":
      await executeOrDryRun(
        "run_scenario",
        { scenarios: intent.scenarioIds, options: intent.options },
        () =>
          runNode([
            "run-scenario",
            "--scenario",
            intent.scenarioIds.join(","),
            ...buildRunOptions(intent.options),
          ]),
      );
      return true;
    case "run_dynamic": {
      state.currentFlow = intent.flow;
      const spec = CHAT_SPECS[intent.flow];
      const env = mapDynamicEnv(intent.flow, intent.cfg || {});
      console.log(`Understood: test/run ${intent.flow} service (dynamic flow).`);
      console.log("Tip: use 'headed' in your message to watch the browser, or Ctrl+C to stop.");
      await executeOrDryRun(
        `run_dynamic_${intent.flow}`,
        { spec, options: intent.options, env },
        () => runCypressSpec(spec, intent.options, env),
      );
      return true;
    }
    case "set_flow":
      state.currentFlow = intent.flow;
      console.log(`Service is set to ${intent.flow}. Say "generate" to run it.`);
      return true;
    case "run_flow":
      state.currentFlow = intent.flow;
      console.log(`Understood: run predefined ${intent.flow} flow test.`);
      await executeOrDryRun(
        "run_flow",
        { flow: intent.flow, options: intent.options },
        () => runNode(["run", "--flows", intent.flow, ...buildRunOptions(intent.options)]),
      );
      return true;
    default: {
      const maybeService = detectService(normalize(state.lastUserInput || ""));
      if (maybeService) {
        console.log(
          `I could not map that request. Detected service ${maybeService}. Try: "test ${maybeService}" or "run virtual staging generate".`,
        );
      } else {
        console.log('I could not map that request. Say "help" for examples.');
      }
      return true;
    }
  }
}

async function runInteractiveChat() {
  console.log("AI HomeDesign Flow Chat Agent");
  console.log('Type your request (or "help").');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "you> ",
  });

  rl.prompt();
  rl.on("line", async (line) => {
    state.lastUserInput = line;
    const intent = await resolveIntent(line);
    const shouldContinue = await handleIntent(intent);
    if (!shouldContinue) {
      rl.close();
      return;
    }
    rl.prompt();
  });
  rl.on("close", () => process.exit(0));
}

async function runSingleShot(input) {
  let normalizedInput = input;
  if (/(^|\s)dry run(\s|$)|درای ران/i.test(input)) {
    state.dryRun = true;
    normalizedInput = input
      .replace(/(^|\s)dry run(\s|$)/gi, " ")
      .replace(/درای ران/gi, " ")
      .trim();
  }
  state.lastUserInput = normalizedInput;
  const intent = await resolveIntent(normalizedInput);
  await handleIntent(intent);
}

async function main() {
  const oneShotInput = process.argv.slice(2).join(" ").trim();
  if (oneShotInput) {
    await runSingleShot(oneShotInput);
    return;
  }
  await runInteractiveChat();
}

main().catch((error) => {
  console.error(`Chat agent failed: ${error.message}`);
  process.exit(1);
});
