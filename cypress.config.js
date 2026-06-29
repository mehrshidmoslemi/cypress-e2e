require('./cypress/config/env')

const { defineConfig } = require('cypress')
const fs = require('fs')
const path = require('path')
const { getOtpFromGmail, waitForEmailWithSubject } = require('./cypress/tasks/gmail-otp')

const downloadsDir = path.join(__dirname, 'cypress', 'downloads')

module.exports = defineConfig({
  defaultCommandTimeout: 90000,
  pageLoadTimeout: 90000,
  requestTimeout: 90000,
  responseTimeout: 90000,
  // Prevent a single chat-driven test from hanging forever.
  execTimeout: 600000,
  // Release browser memory between tests (helps large import/magic flows).
  numTestsKeptInMemory: 0,
  experimentalMemoryManagement: true,
  e2e: {
    downloadsFolder: 'cypress/downloads',
    baseUrl: 'https://app.aihomedesign.com',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    setupNodeEvents(on, config) {
      on('task', {
        getOtpFromGmail,
        waitForEmailWithSubject,
        clearDownloads() {
          if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true })
            return null
          }

          fs.readdirSync(downloadsDir).forEach((fileName) => {
            fs.unlinkSync(path.join(downloadsDir, fileName))
          })
          return null
        },
        getLatestDownload() {
          if (!fs.existsSync(downloadsDir)) {
            return null
          }

          const files = fs
            .readdirSync(downloadsDir)
            .map((fileName) => ({
              fileName,
              mtimeMs: fs.statSync(path.join(downloadsDir, fileName)).mtimeMs,
            }))
            .sort((a, b) => b.mtimeMs - a.mtimeMs)

          return files[0]?.fileName || null
        },
      })
    },
  },
})
