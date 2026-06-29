/**
 * run-cypress.js
 * تست‌های پوشه e2e-final-tests را با reporter json اجرا می‌کند،
 * خروجی JSON را از stdout استخراج کرده و در cypress-results.json ذخیره می‌کند.
 *
 * این فایل توسط n8n (نود Execute Command) فراخوانی می‌شود.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const projectPath = 'C:\\Users\\me.moslemi\\Desktop\\cypress-e2e'
const resultsFile = path.join(projectPath, 'cypress-results.json')
const debugFile = resultsFile + '.debug.txt'

// حذف نتایج قبلی تا اگر اجرای جدید crash کرد، نتایج قدیمی گزارش نشود
for (const f of [resultsFile, debugFile]) {
  if (fs.existsSync(f)) {
    try {
      fs.unlinkSync(f)
    } catch (e) {}
  }
}

let stdout = ''
try {
  // headed طبق درخواست؛ reporter json برای پارس دقیق نتایج
  const cmd =
    'npx cypress run --headed --reporter json --config "specPattern=cypress/e2e-final-tests/**/*.cy.js"'
  console.log('[run-cypress] Running:', cmd)
  stdout = execSync(cmd, {
    cwd: projectPath,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
} catch (err) {
  // cypress در صورت fail شدن تست‌ها exit code غیرصفر می‌دهد - این طبیعی است
  stdout = (err.stdout || '') + (err.stderr || '')
}

// استخراج بلوک JSON از stdout (reporter json آن را در stdout چاپ می‌کند)
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

const jsonData = extractJson(stdout)

if (jsonData && jsonData.stats) {
  fs.writeFileSync(resultsFile, JSON.stringify(jsonData, null, 2), 'utf8')
  console.log('RESULTS_SAVED:' + resultsFile)
  console.log('PASSED:' + (jsonData.stats.passes || 0))
  console.log('FAILED:' + (jsonData.stats.failures || 0))
} else {
  // اجرای cypress قبل از رسیدن به تست‌ها crash کرده (مثلاً خطای config)
  console.log('RESULTS_PARSE_FAILED')
  fs.writeFileSync(debugFile, stdout, 'utf8')
  // یک فایل نتیجه‌ی حداقلی می‌سازیم تا n8n بداند اجرا خراب شده
  const fallback = {
    stats: { suites: 0, tests: 0, passes: 0, pending: 0, failures: 0, start: null, end: null, duration: 0 },
    tests: [],
    passes: [],
    failures: [],
    runnerError: true,
  }
  fs.writeFileSync(resultsFile, JSON.stringify(fallback, null, 2), 'utf8')
}

process.exit(0)
