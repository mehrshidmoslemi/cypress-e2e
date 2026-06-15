/**
 * run-cypress.js
 * cypress رو اجرا می‌کنه، JSON رو از stdout extract می‌کنه و در فایل ذخیره می‌کنه
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectPath = 'C:\\Users\\me.moslemi\\Desktop\\cypress-e2e';
const resultsFile = path.join(projectPath, 'cypress-results.json');

// حذف نتایج قبلی
if (fs.existsSync(resultsFile)) fs.unlinkSync(resultsFile);

let stdout = '';
let parsed = null;
try {
  // فقط از specPattern استفاده می‌کنیم (قابل اعتمادتر روی ویندوز)
  const cmd = 'npx cypress run --headed --reporter json --config "specPattern=cypress/e2e-final-tests/**/*.cy.js"';
  console.log('[run-cypress] Running:', cmd);
  stdout = execSync(cmd, {
    cwd: projectPath,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe']
  });
} catch (err) {
  stdout = err.stdout || '';
}

// پیدا کردن JSON از stdout (نسخه مقاوم)
let jsonData = null;
let jsonStart = stdout.indexOf('{\n  "stats"');
if (jsonStart === -1) jsonStart = stdout.indexOf('{"stats"');
if (jsonStart === -1) {
  // جستجوی گسترده‌تر: پیدا کردن اولین { قبل از "stats"
  const statsIdx = stdout.indexOf('"stats"');
  if (statsIdx !== -1) {
    for (let i = statsIdx; i >= 0; i--) {
      if (stdout[i] === '{') { jsonStart = i; break; }
    }
  }
}

if (jsonStart !== -1) {
  let depth = 0;
  let end = -1;
  for (let i = jsonStart; i < stdout.length; i++) {
    if (stdout[i] === '{') depth++;
    else if (stdout[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end !== -1) {
    try {
      jsonData = JSON.parse(stdout.substring(jsonStart, end + 1));
    } catch(e) {}
  }
}

if (jsonData) {
  fs.writeFileSync(resultsFile, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log('RESULTS_SAVED:' + resultsFile);
  console.log('PASSED:' + (jsonData.stats.passes || 0));
  console.log('FAILED:' + (jsonData.stats.failures || 0));
} else {
  console.log('RESULTS_PARSE_FAILED');
  // ذخیره stdout خام برای debug
  fs.writeFileSync(resultsFile + '.debug.txt', stdout, 'utf8');
}

process.exit(0);
