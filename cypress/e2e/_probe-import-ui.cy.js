const { createImportListingHelpers, LISTING_URLS, INVALID_URLS } = require('../support/import-listing-shared')
const h = createImportListingHelpers('probe-import-ui')

describe('probe import ui', () => {
  it('leave stay modal triggers', () => {
    h.ensureLoggedIn()
    h.startListingImport({
      entry: 'uploader',
      provider: 'zillow',
      url: LISTING_URLS.zillow,
      loggedIn: true,
      stopBeforeConfirm: true,
    })

    cy.contains('Check Details').should('be.visible')
    cy.get('[role="dialog"]').then(($dialogs) => {
      const info = [...$dialogs].map((d) => ({
        text: d.textContent.slice(0, 500),
        buttons: [...d.querySelectorAll('button')].map((b) => ({
          text: (b.textContent || b.getAttribute('aria-label') || '').trim(),
          visible: Cypress.dom.isVisible(b),
        })),
      }))
      cy.writeFile('cypress/fixtures/probe-check-details-dialog.json', info)
    })

    cy.get('body').type('{esc}', { force: true })
    cy.wait(1000)
    cy.get('body').invoke('text').then((t) => cy.writeFile('cypress/fixtures/probe-after-esc.txt', t.slice(0, 4000)))

    cy.get('[role="dialog"] button').then(($btns) => {
      const closeBtn = [...$btns].find((b) => {
        const label = (b.getAttribute('aria-label') || '').toLowerCase()
        const cls = b.className || ''
        return label === 'close' || cls.includes('tabler:x') || b.querySelector('[class*="tabler:x"]')
      })
      if (closeBtn) cy.wrap(closeBtn).click({ force: true })
    })
    cy.wait(1000)
    cy.get('body').invoke('text').then((t) => cy.writeFile('cypress/fixtures/probe-after-close-btn.txt', t.slice(0, 4000)))
  })

  it('malformed url behavior', () => {
    h.ensureLoggedIn()
    h.openUploaderImport('zillow')
    h.submitListingUrl(INVALID_URLS.malformed)
    cy.wait(3000)
    cy.get('body').invoke('text').then((t) => cy.writeFile('cypress/fixtures/probe-malformed-url.txt', t.slice(0, 4000)))
    cy.get('button[aria-label="Continue with listing URL"]').then(($btn) => {
      cy.writeFile('cypress/fixtures/probe-malformed-continue-disabled.json', {
        disabled: $btn.prop('disabled'),
        ariaDisabled: $btn.attr('aria-disabled'),
      })
    })
  })

  it('create project modal when logged in on studio', () => {
    h.ensureLoggedIn()
    cy.visit('/studio/projects')
    h.flow.prepareSiteForTesting()
    h.flow.completeOnboardingIfShown()
    cy.get('nav [aria-haspopup="dialog"].rounded-full', { timeout: 90000 }).should('be.visible')

    cy.contains('button', 'Create Project').scrollIntoView().click({ force: true })
    cy.wait(2000)
    cy.get('[role="dialog"]').then(($dialogs) => {
      const info = [...$dialogs].map((d) => ({
        text: d.textContent.slice(0, 800),
        buttons: [...d.querySelectorAll('button, a')].filter((el) => Cypress.dom.isVisible(el)).map((el) => ({
          text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 80),
        })),
      }))
      cy.writeFile('cypress/fixtures/probe-create-modal-v2.json', info)
    })
  })
})
