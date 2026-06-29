const { createImportListingHelpers, INVALID_URLS } = require('../support/import-listing-shared')
const h = createImportListingHelpers('probe-cp-submit')

describe('probe create project submit', () => {
  it.only('buttons after invalid url typed', () => {
    h.ensureLoggedIn()
    h.openCreateProjectImport()
    cy.get('[role="dialog"] input[type="text"]').then(($inputs) => {
      const urlInput =
        [...$inputs].find((el) => {
          const ph = (el.placeholder || '').toLowerCase()
          return ph.includes('http') || ph.includes('realtor') || ph.includes('zillow')
        }) || $inputs[$inputs.length - 1]
      cy.wrap(urlInput).clear({ force: true }).type(INVALID_URLS.zillow, { force: true })
    })
    cy.wait(1000)
    cy.document().then((doc) => {
      const buttons = [...doc.querySelectorAll('button')].map((el) => ({
        text: (el.textContent || el.getAttribute('aria-label') || '').trim(),
        visible: Cypress.dom.isVisible(el),
        disabled: el.disabled,
      }))
      cy.writeFile('cypress/fixtures/probe-cp-after-invalid.json', buttons.filter((b) => b.visible && b.text))
    })
    cy.get('body').invoke('text').then((t) => cy.writeFile('cypress/fixtures/probe-cp-after-invalid-body.txt', t.slice(0, 5000)))
  })
})
