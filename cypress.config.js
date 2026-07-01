require('./cypress/config/env')

const { defineConfig } = require('cypress')
const fs = require('fs')
const path = require('path')
const { getOtpFromGmail, waitForEmailWithSubject } = require('./cypress/tasks/gmail-otp')

const downloadsDir = path.join(__dirname, 'cypress', 'downloads')

module.exports = defineConfig({
  env: {
    STUDIO_MOVE_EMAIL: process.env.STUDIO_MOVE_EMAIL,
    STUDIO_MOVE_PASSWORD: process.env.STUDIO_MOVE_PASSWORD,
    STUDIO_NOCREDIT_EMAIL: process.env.STUDIO_NOCREDIT_EMAIL,
    STUDIO_NOCREDIT_PASSWORD: process.env.STUDIO_NOCREDIT_PASSWORD,
    STUDIO_NO_PLAN_EMAIL: process.env.STUDIO_NO_PLAN_EMAIL,
    STUDIO_NO_PLAN_PASSWORD: process.env.STUDIO_NO_PLAN_PASSWORD,
    PRICING_FREE_EMAIL: process.env.PRICING_FREE_EMAIL,
    PRICING_FREE_PASSWORD: process.env.PRICING_FREE_PASSWORD,
    PRICING_RESTRICTED_EMAIL: process.env.PRICING_RESTRICTED_EMAIL,
    PRICING_RESTRICTED_PASSWORD: process.env.PRICING_RESTRICTED_PASSWORD,
    PRICING_ACTIVE_EMAIL: process.env.PRICING_ACTIVE_EMAIL,
    PRICING_ACTIVE_PASSWORD: process.env.PRICING_ACTIVE_PASSWORD,
    PRICING_ACTIVE_MONTHLY_EMAIL: process.env.PRICING_ACTIVE_MONTHLY_EMAIL,
    PRICING_ACTIVE_MONTHLY_PASSWORD: process.env.PRICING_ACTIVE_MONTHLY_PASSWORD,
    PRICING_ACTIVE_YEARLY_EMAIL: process.env.PRICING_ACTIVE_YEARLY_EMAIL,
    PRICING_ACTIVE_YEARLY_PASSWORD: process.env.PRICING_ACTIVE_YEARLY_PASSWORD,
    PRICING_PROPLUS_MONTHLY_EMAIL: process.env.PRICING_PROPLUS_MONTHLY_EMAIL,
    PRICING_PROPLUS_MONTHLY_PASSWORD: process.env.PRICING_PROPLUS_MONTHLY_PASSWORD,
    PRICING_PRICES_FREE_EMAIL: process.env.PRICING_PRICES_FREE_EMAIL,
    PRICING_PRICES_FREE_PASSWORD: process.env.PRICING_PRICES_FREE_PASSWORD,
    PRICING_PRICES_PRO_MONTHLY_EMAIL: process.env.PRICING_PRICES_PRO_MONTHLY_EMAIL,
    PRICING_PRICES_PRO_MONTHLY_PASSWORD: process.env.PRICING_PRICES_PRO_MONTHLY_PASSWORD,
    PRICING_PRICES_PRO_PLUS_MONTHLY_EMAIL: process.env.PRICING_PRICES_PRO_PLUS_MONTHLY_EMAIL,
    PRICING_PRICES_PRO_PLUS_MONTHLY_PASSWORD: process.env.PRICING_PRICES_PRO_PLUS_MONTHLY_PASSWORD,
    PRICING_PRICES_ENTERPRISE_MONTHLY_EMAIL: process.env.PRICING_PRICES_ENTERPRISE_MONTHLY_EMAIL,
    PRICING_PRICES_ENTERPRISE_MONTHLY_PASSWORD: process.env.PRICING_PRICES_ENTERPRISE_MONTHLY_PASSWORD,
    PRICING_PRICES_PRO_YEARLY_EMAIL: process.env.PRICING_PRICES_PRO_YEARLY_EMAIL,
    PRICING_PRICES_PRO_YEARLY_PASSWORD: process.env.PRICING_PRICES_PRO_YEARLY_PASSWORD,
    PRICING_PRICES_PRO_PLUS_YEARLY_EMAIL: process.env.PRICING_PRICES_PRO_PLUS_YEARLY_EMAIL,
    PRICING_PRICES_PRO_PLUS_YEARLY_PASSWORD: process.env.PRICING_PRICES_PRO_PLUS_YEARLY_PASSWORD,
    PRICING_PRICES_ENTERPRISE_YEARLY_EMAIL: process.env.PRICING_PRICES_ENTERPRISE_YEARLY_EMAIL,
    PRICING_PRICES_ENTERPRISE_YEARLY_PASSWORD: process.env.PRICING_PRICES_ENTERPRISE_YEARLY_PASSWORD,
  },
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
