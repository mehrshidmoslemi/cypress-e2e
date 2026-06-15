const { defineConfig } = require('cypress')

module.exports = defineConfig({
  defaultCommandTimeout: 90000,
  pageLoadTimeout: 90000,
  requestTimeout: 90000,
  responseTimeout: 90000,
  // Prevent a single chat-driven test from hanging forever.
  execTimeout: 600000,
  e2e: {
    baseUrl: 'https://app.aihomedesign.com',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
})
