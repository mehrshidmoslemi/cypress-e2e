/**
 * Probe — profile edit + brand center + free profile after onboarding dismiss
 */

const { createPricingPageHelpers } = require('../support/pricing-page-shared')
const { dismissBlockingModals } = require('../support/signup-shared')

const pricing = createPricingPageHelpers('probe-profile-ext')

const dismissStartup = () => {
  cy.get('body').then(($body) => {
    if (!$body.text().includes('Which best describes you?')) return
    cy.get('[role="dialog"]:visible').then(($dialog) => {
      if ($dialog.text().includes('Other')) cy.wrap($dialog).contains('Other').click({ force: true })
    })
    cy.get('body', { timeout: 30000 }).then(($body2) => {
      if ($body2.text().includes('Just testing AIHomeDesign')) {
        cy.contains('Just testing AIHomeDesign').click({ force: true })
        cy.contains("I'll explore on my own").click({ force: true })
      } else if ($body2.text().includes('Which best describes you?')) {
        cy.get('button[aria-label="Close"]').first().click({ force: true })
      }
    })
  })
}

const dumpPage = (label, selector = 'body') => {
  cy.get(selector).then(($el) => {
    cy.writeFile(`cypress/fixtures/probe-profile-${label}.html`, ($el[0]?.outerHTML || '').slice(0, 150000))
    cy.writeFile(
      `cypress/fixtures/probe-profile-${label}.txt`,
      ($el[0]?.textContent || '').replace(/\s+/g, ' ').slice(0, 10000),
    )
  })
}

describe('probe profile extended', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  it('free profile after onboarding dismiss', () => {
    pricing.ensureLoggedIn('free')
    cy.visit('/', { timeout: 120000, retryOnStatusCodeFailure: true })
    dismissBlockingModals()
    dismissStartup()
    cy.get('nav [aria-haspopup="dialog"].rounded-full').last().click({ force: true })
    cy.wait(1500)
    dumpPage('free-popover', '[role="dialog"]:visible')
  })

  it('account settings page fields', () => {
    pricing.ensureLoggedIn('paidProPlus')
    cy.visit('/account/settings', { timeout: 120000, retryOnStatusCodeFailure: true })
    dismissBlockingModals()
    dismissStartup()
    cy.wait(2000)
    dumpPage('account-settings')

    cy.get('body').then(($body) => {
      const fields = [...$body.find('input, textarea, button, a')].map((el) => ({
        tag: el.tagName,
        id: el.id || null,
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        placeholder: el.getAttribute('placeholder'),
      }))
      cy.writeFile('cypress/fixtures/probe-profile-account-settings-fields.json', fields.slice(0, 80))
    })
  })

  it('profile edit from popover click', () => {
    pricing.ensureLoggedIn('paidProPlus')
    cy.visit('/', { timeout: 120000, retryOnStatusCodeFailure: true })
    dismissBlockingModals()
    dismissStartup()
    cy.get('nav [aria-haspopup="dialog"].rounded-full').last().click({ force: true })
    cy.get('[role="dialog"]:visible').contains(/@/).closest('.cursor-pointer').click({ force: true })
    cy.wait(2000)
    dumpPage('profile-edit')
  })
})
