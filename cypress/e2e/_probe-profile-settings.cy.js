/**
 * Probe — discover Profile & Settings DOM selectors
 */

const { createPricingPageHelpers } = require('../support/pricing-page-shared')

const pricing = createPricingPageHelpers('probe-profile')

const dumpProfileUi = (label) => {
  cy.get('nav [aria-haspopup="dialog"].rounded-full').last().click({ force: true })
  cy.wait(1500)

  cy.get('[role="dialog"]:visible, [data-radix-popper-content-wrapper]').then(($dialogs) => {
    const visible = [...$dialogs].filter((el) => Cypress.dom.isVisible(el))
    const target = visible[visible.length - 1] || visible[0]
    const html = target?.outerHTML || ''
    const text = target?.textContent?.replace(/\s+/g, ' ').trim() || ''

    cy.writeFile(`cypress/fixtures/probe-profile-${label}-dialog.html`, html.slice(0, 120000))
    cy.writeFile(`cypress/fixtures/probe-profile-${label}-dialog.txt`, text.slice(0, 8000))

    const controls = [...(target?.querySelectorAll('button, a, input, [role="switch"], label') || [])]
      .filter((el) => Cypress.dom.isVisible(el))
      .map((el) => ({
        tag: el.tagName,
        id: el.id || null,
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
        ariaLabel: el.getAttribute('aria-label'),
        href: el.getAttribute('href'),
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        role: el.getAttribute('role'),
      }))

    cy.writeFile(`cypress/fixtures/probe-profile-${label}-controls.json`, controls)
  })

  cy.get('html').then(($html) => {
    cy.writeFile(
      `cypress/fixtures/probe-profile-${label}-page.html`,
      $html[0].outerHTML.slice(0, 80000),
    )
  })
}

describe('probe profile settings', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  it('dumps free account profile UI', () => {
    pricing.ensureLoggedIn('free')
    cy.visit('/', { timeout: 120000, retryOnStatusCodeFailure: true })
    cy.get('nav', { timeout: 60000 }).should('exist')
    dumpProfileUi('free')
  })

  it('dumps paidProPlus account profile UI', () => {
    pricing.ensureLoggedIn('paidProPlus')
    cy.visit('/', { timeout: 120000, retryOnStatusCodeFailure: true })
    cy.get('nav', { timeout: 60000 }).should('exist')
    dumpProfileUi('paidProPlus')
  })
})
