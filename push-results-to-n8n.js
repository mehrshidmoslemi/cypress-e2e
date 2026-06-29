/**
 * push-results-to-n8n.js
 *
 * این اسکریپت روی همین کامپیوتر ویندوز (که cypress و مرورگر دارد) اجرا می‌شود.
 * هر ساعت یکبار توسط Task Scheduler ویندوز فراخوانی می‌شود و:
 *   1) تست‌های cypress/e2e-final-tests را اجرا می‌کند (headed)
 *   2) نتایج JSON را parse می‌کند (pass / fail + علت fail)
 *   3) یک payload خلاصه را به Webhook ای که در n8n ساخته‌ای POST می‌کند
 *
 * n8n سرور فقط نتیجه را می‌گیرد و به اسلک گزارش می‌دهد. هیچ tunnel/پورت بازی لازم نیست.
 *
 * تنظیم: متغیر محیطی N8N_WEBHOOK_URL را ست کن یا مقدار پیش‌فرض پایین را ویرایش کن.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const projectPath = 'C:\\Users\\me.moslemi\\Desktop\\cypress-e2e'
const resultsFile = path.join(projectPath, 'cypress-results.json')
const debugFile = resultsFile + '.debug.txt'

// --- آدرس webhook n8n (Production URL نود Webhook) ---
const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  'https://YOUR-N8N-HOST/webhook/cypress-report'

const startTime = new Date()
const pad = (n) => String(n).padStart(2, '0')
const runId =
  'run-' +
  startTime.getFullYear() +
  pad(startTime.getMonth() + 1) +
  pad(startTime.getDate()) +
  '-' +
  pad(startTime.getHours()) +
  pad(startTime.getMinutes()) +
  pad(startTime.getSeconds())

// ---------- 1) اجرای cypress ----------
for (const f of [resultsFile, debugFile]) {
  if (fs.existsSync(f)) {
    try {
      fs.unlinkSync(f)
    } catch (e) {}
  }
}

let stdout = ''
try {
  const cmd =
    'npx cypress run --headed --reporter json --config "specPattern=cypress/e2e-final-tests/**/*.cy.js"'
  console.log('[push] Running:', cmd)
  stdout = execSync(cmd, {
    cwd: projectPath,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
} catch (err) {
  stdout = (err.stdout || '') + (err.stderr || '')
}

// ---------- 2) استخراج و parse نتایج ----------
function extractJson(text) {
  let start = text.indexOf('{\n  "stats"')
  if (start === -1) start = text.indexOf('{"stats"')
  if (start === -1) {
    const statsIdx = text.indexOf('"stats"')
    if (statsIdx !== -1) {
      for (let i = statsIdx; i >= 0; i--) {
        if (text[i] === '{') {
          start = i
          break
        }
      }
    }
  }
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.substring(start, i + 1))
        } catch (e) {
          return null
        }
      }
    }
  }
  return null
}

function cleanError(msg) {
  if (!msg) return 'Unknown error'
  return String(msg)
    .replace(/^CypressError:\s*/, '')
    .replace(/\r/g, '')
    .trim()
}

const parsed = extractJson(stdout)

let passed = 0,
  failed = 0,
  pending = 0,
  skipped = 0
const passedTests = []
const failedTests = []
let runnerError = false

if (parsed && parsed.stats) {
  fs.writeFileSync(resultsFile, JSON.stringify(parsed, null, 2), 'utf8')
  const s = parsed.stats
  passed = s.passes || 0
  failed = s.failures || 0
  pending = s.pending || 0
  skipped = s.skipped || 0

  const passArr = Array.isArray(parsed.passes) ? parsed.passes : []
  const failArr = Array.isArray(parsed.failures) ? parsed.failures : []

  if (passArr.length || failArr.length) {
    for (const t of passArr) {
      passedTests.push({ title: t.fullTitle || t.title || 'Unknown test', duration: t.duration || 0 })
    }
    for (const t of failArr) {
      failedTests.push({
        title: t.fullTitle || t.title || 'Unknown test',
        error: cleanError(t.err && t.err.message),
        duration: t.duration || 0,
      })
    }
  } else if (Array.isArray(parsed.tests)) {
    for (const t of parsed.tests) {
      const hasErr = !!(t.err && t.err.message)
      const title = t.fullTitle || t.title || 'Unknown test'
      if (hasErr) failedTests.push({ title, error: cleanError(t.err.message), duration: t.duration || 0 })
      else if (!t.pending) passedTests.push({ title, duration: t.duration || 0 })
    }
    if (!passed && !failed) {
      passed = passedTests.length
      failed = failedTests.length
    }
  }
} else {
  // cypress قبل از اجرای تست‌ها crash کرده
  runnerError = true
  fs.writeFileSync(debugFile, stdout, 'utf8')
}

const endTime = new Date()
const durationMs = endTime - startTime
const durationMin = Math.floor(durationMs / 60000)
const durationSec = Math.floor((durationMs % 60000) / 1000)
const total = passed + failed + pending + skipped
const successRate = total > 0 ? Math.round((passed / total) * 100) : 0

let overallStatus
if (runnerError) overallStatus = 'ERROR'
else if (total === 0) overallStatus = 'NO_TESTS'
else if (failed === 0) overallStatus = 'PASS'
else overallStatus = 'FAIL'

const payload = {
  runId,
  overallStatus,
  successRate,
  stats: { passed, failed, pending, skipped, total },
  passedTests,
  failedTests,
  duration: durationMin + 'm ' + durationSec + 's',
  startTime: startTime.toISOString(),
  endTime: endTime.toISOString(),
  startTimeFormatted: startTime.toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }),
  endTimeFormatted: endTime.toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }),
  baseUrl: 'https://app.aihomedesign.com',
  testsPath: 'cypress/e2e-final-tests',
  hostname: require('os').hostname(),
  runnerError,
}

console.log(
  '[push] Result:',
  overallStatus,
  '| passed:',
  passed,
  'failed:',
  failed,
  '| duration:',
  payload.duration
)

// ---------- 3) POST به webhook n8n ----------
function postToN8n(urlStr, body) {
  return new Promise((resolve, reject) => {
    let url
    try {
      url = new URL(urlStr)
    } catch (e) {
      return reject(new Error('Invalid N8N_WEBHOOK_URL: ' + urlStr))
    }
    const data = JSON.stringify(body)
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let resp = ''
        res.on('data', (c) => (resp += c))
        res.on('end', () => resolve({ statusCode: res.statusCode, body: resp }))
      }
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

postToN8n(N8N_WEBHOOK_URL, payload)
  .then((res) => {
    console.log('[push] Sent to n8n. Status:', res.statusCode)
    process.exit(0)
  })
  .catch((err) => {
    console.error('[push] Failed to send to n8n:', err.message)
    // payload را لوکال ذخیره کن تا گم نشود
    fs.writeFileSync(path.join(projectPath, 'last-payload.json'), JSON.stringify(payload, null, 2), 'utf8')
    process.exit(1)
  })
