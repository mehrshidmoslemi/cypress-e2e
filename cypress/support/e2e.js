// Import commands.js using ES2015 syntax:
import './commands'
import 'cypress-real-events'
import 'cypress-hover'

// Ignore known app errors that should not fail otherwise-stable E2E flows.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes("reading 'error'")) {
    return false
  }
  if (err.message.includes('An unknown error has occurred')) {
    return false
  }
  if (err.message.includes('failed to pay credit')) {
    return false
  }
})
