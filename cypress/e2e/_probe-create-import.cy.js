const { createImportListingHelpers } = require('../support/import-listing-shared')
const h = createImportListingHelpers('probe')

describe('probe create project import ui', () => {
  it.only('logged in create project modal', () => {
    h.ensureLoggedIn()
    cy.visit('/studio/projects')
    h.flow.prepareSiteForTesting()
    cy.contains('button', 'Create Project').scrollIntoView().click({ force: true })
    cy.wait(2000)
    cy.get('[role="dialog"]').should('exist')
    cy.document().then((doc) => {
      const buttons = [...doc.querySelectorAll('[role="dialog"] button, [role="dialog"] a')].map((el) => ({
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 100),
        visible: Cypress.dom.isVisible(el),
      }))
      cy.writeFile('cypress/fixtures/probe-create-import-buttons.json', buttons.filter((b) => b.visible && b.text))
    })
    cy.get('body').invoke('text').then((t) => cy.writeFile('cypress/fixtures/probe-create-import-body.txt', t.slice(0, 6000)))
  })
})
