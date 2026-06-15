#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const E2E_DIR = path.join(ROOT_DIR, "cypress", "e2e");

const FLOW_GROUPS = {
  all: null,
  smoke: ["VS", "IR", "IE", "D2D"],
  renovation: ["BC", "CC", "WC", "FC", "FR", "UC", "ID"],
  edit: ["VS", "IR", "IE", "D2D"],
};

const SCENARIOS = [
  { id: 1, title: "Landing navigation and CTAs", mode: "manual", flows: [] },
  { id: 2, title: "Landing banner behavior", mode: "manual", flows: [] },
  { id: 3, title: "Signup and login", mode: "manual", flows: [] },
  { id: 4, title: "Forgot password", mode: "manual", flows: [] },
  { id: 5, title: "Auth notifications (Slack/Email)", mode: "manual", flows: [] },
  { id: 6, title: "Pricing plan and access control", mode: "manual", flows: [] },
  { id: 7, title: "Upload validation", mode: "manual", flows: [] },
  { id: 8, title: "Generate preconditions validation", mode: "hybrid", flows: ["VS", "IR", "IE", "UC"] },
  {
    id: 9,
    title: "Core generation in all services",
    mode: "automated",
    flows: ["BC", "CC", "WC", "FC", "FR", "UC", "ID", "VS", "IR", "IE", "D2D"],
  },
  { id: 10, title: "Virtual staging variations", mode: "automated", flows: ["VS"] },
  { id: 11, title: "VS Multi-Angle enable flow", mode: "manual", flows: [] },
  { id: 12, title: "VS Multi-Angle second image validation", mode: "manual", flows: [] },
  { id: 13, title: "VS Multi-Angle generate flow", mode: "manual", flows: [] },
  { id: 14, title: "VS Multi-Angle toggle off after upload", mode: "manual", flows: [] },
  { id: 15, title: "VS Multi-Angle upload sources (logged-in)", mode: "manual", flows: [] },
  { id: 16, title: "VS Multi-Angle upload sources (logged-out)", mode: "manual", flows: [] },
  { id: 17, title: "VS Multi-Angle with only one image", mode: "manual", flows: [] },
  { id: 18, title: "Post-generation actions", mode: "automated", flows: ["VS", "IR", "IE", "D2D", "UC"] },
  { id: 19, title: "Download variations", mode: "automated", flows: ["VS", "IR", "UC", "BC", "CC", "FC", "FR", "WC", "ID", "IE", "D2D"] },
  { id: 20, title: "Downloaded file validation", mode: "manual", flows: [] },
  { id: 21, title: "VS Remove Item", mode: "automated", flows: ["IR"] },
  { id: 22, title: "Free user and credit behavior", mode: "manual", flows: [] },
  { id: 23, title: "Restricted user behavior", mode: "manual", flows: [] },
  { id: 24, title: "Paid user credit=0 behavior", mode: "manual", flows: [] },
  { id: 25, title: "Paid user with credit behavior", mode: "manual", flows: [] },
  { id: 26, title: "Credit deduction logic", mode: "manual", flows: [] },
];

function parseArgs(argv) {
  const args = {
    command: "list",
    flows: null,
    group: null,
    scenario: null,
    optimized: true,
    headed: false,
    browser: null,
  };

  const rest = [...argv];
  if (rest.length > 0 && !rest[0].startsWith("--")) {
    args.command = rest.shift();
  }

  while (rest.length > 0) {
    const token = rest.shift();
    switch (token) {
      case "--flows":
      case "-f":
        args.flows = rest.shift();
        break;
      case "--group":
      case "-g":
        args.group = rest.shift();
        break;
      case "--scenario":
      case "-s":
        args.scenario = rest.shift();
        break;
      case "--raw":
        args.optimized = false;
        break;
      case "--optimized":
        args.optimized = true;
        break;
      case "--headed":
        args.headed = true;
        break;
      case "--browser":
      case "-b":
        args.browser = rest.shift();
        break;
      case "--help":
      case "-h":
        args.command = "help";
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function getSpecs() {
  const files = fs
    .readdirSync(E2E_DIR)
    .filter((name) => name.endsWith(".cy.js") && name.includes("-flow-test"))
    .sort();

  const map = new Map();

  for (const fileName of files) {
    const codeMatch = fileName.match(/^([A-Z0-9]+)-flow-test(-optimized)?\.cy\.js$/);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    const optimized = Boolean(codeMatch[2]);
    const absPath = path.join(E2E_DIR, fileName);
    const info = extractSpecInfo(absPath, code);

    if (!map.has(code)) {
      map.set(code, { code, optimizedPath: null, rawPath: null, info });
    }
    const record = map.get(code);
    if (optimized) {
      record.optimizedPath = absPath;
    } else {
      record.rawPath = absPath;
    }
    if (!record.info.testSuite && info.testSuite) {
      record.info = info;
    }
  }

  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function extractSpecInfo(specPath, code) {
  const lines = fs.readFileSync(specPath, "utf8").split(/\r?\n/).slice(0, 20);
  const header = lines.join("\n");

  const testSuiteMatch = header.match(/Test Suite\s*:\s*(.+)/);
  const coverageMatch = header.match(/Coverage\s*:\s*(.+)/);

  return {
    code,
    testSuite: testSuiteMatch ? testSuiteMatch[1].trim() : "",
    coverage: coverageMatch ? coverageMatch[1].trim() : "",
  };
}

function normalizeFlowCodes(input) {
  if (!input) return [];
  return input
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
}

function normalizeScenarioIds(input) {
  if (!input) return [];
  return input
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean)
    .map((token) => token.replace(/^S/i, ""))
    .map((token) => Number.parseInt(token, 10))
    .filter((num) => Number.isInteger(num) && num > 0);
}

function resolveFlows(specs, args) {
  const available = new Map(specs.map((s) => [s.code, s]));

  let selectedCodes = [];

  if (args.group) {
    const group = args.group.toLowerCase();
    if (!(group in FLOW_GROUPS)) {
      const valid = Object.keys(FLOW_GROUPS).join(", ");
      throw new Error(`Unknown group "${args.group}". Valid groups: ${valid}`);
    }
    if (group === "all") {
      selectedCodes = [...available.keys()];
    } else {
      selectedCodes = FLOW_GROUPS[group];
    }
  } else if (args.flows) {
    selectedCodes = normalizeFlowCodes(args.flows);
  } else {
    selectedCodes = [...available.keys()];
  }

  const missing = selectedCodes.filter((code) => !available.has(code));
  if (missing.length) {
    throw new Error(`Unknown flow code(s): ${missing.join(", ")}`);
  }

  return selectedCodes.map((code) => available.get(code));
}

function pickSpecPath(flow, optimized) {
  if (optimized && flow.optimizedPath) return flow.optimizedPath;
  if (!optimized && flow.rawPath) return flow.rawPath;
  return flow.optimizedPath || flow.rawPath;
}

function printList(specs) {
  console.log("AI HomeDesign flow inventory:");
  for (const flow of specs) {
    const types = [];
    if (flow.optimizedPath) types.push("optimized");
    if (flow.rawPath) types.push("raw");
    const suite = flow.info.testSuite || `${flow.code} flow`;
    const coverage = flow.info.coverage ? ` | ${flow.info.coverage}` : "";
    console.log(`- ${flow.code}: ${suite} [${types.join(", ")}]${coverage}`);
  }
}

function printSelected(flows, optimized) {
  console.log(
    `Selected ${flows.length} flow(s) using ${optimized ? "optimized" : "raw"} specs when available:`,
  );
  for (const flow of flows) {
    const specPath = pickSpecPath(flow, optimized);
    const rel = path.relative(ROOT_DIR, specPath);
    console.log(`- ${flow.code}: ${rel}`);
  }
}

function printScenarioList() {
  console.log("QA scenarios from AI HomeDesign test document:");
  for (const s of SCENARIOS) {
    const id = String(s.id).padStart(2, "0");
    const flowPart = s.flows.length ? ` | flows: ${s.flows.join(",")}` : "";
    console.log(`- S${id}: ${s.title} [${s.mode}]${flowPart}`);
  }
}

function getScenariosByIds(ids) {
  const byId = new Map(SCENARIOS.map((s) => [s.id, s]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new Error(`Unknown scenario id(s): ${missing.join(", ")}`);
  }
  return ids.map((id) => byId.get(id));
}

function resolveFlowsFromScenario(specs, scenarioIds) {
  const scenarios = getScenariosByIds(scenarioIds);
  const automated = scenarios.filter((s) => s.flows.length > 0);
  const manualOnly = scenarios.filter((s) => s.flows.length === 0);

  if (manualOnly.length > 0) {
    console.log("\nManual-only scenarios (no direct Cypress mapping):");
    for (const s of manualOnly) {
      console.log(`- S${String(s.id).padStart(2, "0")}: ${s.title}`);
    }
  }

  if (automated.length === 0) {
    throw new Error("Selected scenario(s) are manual-only and have no mapped Cypress flows.");
  }

  const mappedCodes = [...new Set(automated.flatMap((s) => s.flows))];
  const available = new Map(specs.map((s) => [s.code, s]));
  const missingCodes = mappedCodes.filter((code) => !available.has(code));
  if (missingCodes.length) {
    throw new Error(`Scenario mapping references missing flow(s): ${missingCodes.join(", ")}`);
  }

  console.log("\nScenario → flow mapping:");
  for (const s of automated) {
    console.log(`- S${String(s.id).padStart(2, "0")}: ${s.flows.join(",")}`);
  }

  return mappedCodes.map((code) => available.get(code));
}

function runCypress(flows, args) {
  const selectedSpecs = flows.map((f) => pickSpecPath(f, args.optimized));
  const specArg = selectedSpecs.map((p) => path.relative(ROOT_DIR, p).replace(/\\/g, "/")).join(",");

  const cypressArgs = ["cypress", "run", "--spec", specArg];
  if (args.headed) cypressArgs.push("--headed");
  if (args.browser) cypressArgs.push("--browser", args.browser);

  console.log(`Running: npx ${cypressArgs.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn("npx", cypressArgs, {
      cwd: ROOT_DIR,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Cypress exited with code ${code}`));
    });
  });
}

function printHelp() {
  console.log(`
Usage:
  node tools/flow-agent.js list
  node tools/flow-agent.js scenarios
  node tools/flow-agent.js run [--flows IE,UC] [--group smoke|renovation|edit|all] [--raw] [--headed] [--browser chrome]
  node tools/flow-agent.js run-scenario --scenario 9
  node tools/flow-agent.js run-scenario --scenario 9,10,18
  node tools/flow-agent.js help

Examples:
  node tools/flow-agent.js list
  node tools/flow-agent.js scenarios
  node tools/flow-agent.js run --group smoke
  node tools/flow-agent.js run --flows IE,UC --headed --browser chrome
  node tools/flow-agent.js run --flows VS --raw
  node tools/flow-agent.js run-scenario --scenario 9,21
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const specs = getSpecs();

  if (specs.length === 0) {
    throw new Error(`No flow specs found in ${E2E_DIR}`);
  }

  if (args.command === "help") {
    printHelp();
    return;
  }

  if (args.command === "list") {
    printList(specs);
    return;
  }

  if (args.command === "scenarios") {
    printScenarioList();
    return;
  }

  if (args.command === "run") {
    const selected = resolveFlows(specs, args);
    printSelected(selected, args.optimized);
    await runCypress(selected, args);
    return;
  }

  if (args.command === "run-scenario") {
    const ids = normalizeScenarioIds(args.scenario);
    if (!ids.length) {
      throw new Error('run-scenario requires --scenario, for example "--scenario 9,10".');
    }
    const selected = resolveFlowsFromScenario(specs, ids);
    printSelected(selected, args.optimized);
    await runCypress(selected, args);
    return;
  }

  if (args.command !== "run") {
    throw new Error(`Unknown command: ${args.command}`);
  }
}

main().catch((error) => {
  console.error(`\nFlow agent failed: ${error.message}`);
  process.exit(1);
});
