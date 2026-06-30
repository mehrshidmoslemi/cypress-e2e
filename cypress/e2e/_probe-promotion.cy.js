describe('probe live monthly apis', () => {
  it('captures payment apis', () => {
    cy.on('uncaught:exception', () => false)
    const { createPricingPageHelpers } = require('../support/pricing-page-shared')
    const p = createPricingPageHelpers('probe-monthly-api')
    const captured = []

    cy.intercept('GET', '**/v1/payment/**', (req) => {
      req.continue((res) => captured.push({ url: req.url, body: res.body }))
    })

    p.ensureLoggedIn('activeMonthly')
    p.visitBilling()
    cy.wait(3000)
    cy.then(() => cy.writeFile('cypress/fixtures/probe-live-monthly-payment-apis.json', captured))
  })
})
