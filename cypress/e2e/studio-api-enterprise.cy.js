/**
 * Studio API section — Enterprise vs non-Enterprise (scenarios 16.1–16.6)
 */

const { createStudioApiHelpers } = require('../support/studio-api-shared')

const api = createStudioApiHelpers('studio-api-enterprise')

describe('Studio API — Enterprise & upsell', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  describe('A. API section access by account type', () => {
    it('Enterprise account shows real API content', () => {
      api.ensureLoggedIn('enterprise')
      api.openApiSection()
      api.assertEnterpriseApiContent()
    })

    it('Non-Enterprise account shows Enterprise upsell instead of API content', () => {
      api.ensureLoggedIn('proPlusMonthly')
      api.openApiSection()
      api.assertEnterpriseUpsell()
    })
  })

  describe('B. Enterprise — API Key & details', () => {
    beforeEach(() => {
      api.ensureLoggedIn('enterprise')
      api.openApiSection()
      api.dismissOverlayModals()
    })

    it('displays API Key and API details', () => {
      api.assertEnterpriseApiContent()
      cy.contains(/mcp endpoint|server health check/i).should('be.visible')
      cy.contains('a', /https:\/\/mcp\.aihomedesign\.com\/health/i).should('exist')
    })

    it('every actionable button in the API section works', () => {
      api.testApiSectionButtons()
    })
  })

  describe('C. Enterprise — Webhook Logs', () => {
    beforeEach(() => {
      api.ensureLoggedIn('enterprise')
      api.openApiSection()
      api.dismissOverlayModals()
    })

    it('renders webhook logs list with expected controls', () => {
      api.openWebhookLogs()
      api.assertWebhookLogsPage()
      api.assertWebhookLogsMatchApi()
    })

    it('filter and reload actions work', () => {
      api.openWebhookLogs()
      api.testWebhookLogFilters()
    })

    it('handles empty webhook logs gracefully', () => {
      api.assertWebhookLogsEmptyState()
    })
  })

  describe('D. Non-Enterprise — Enterprise upsell in API section', () => {
    it('Pro Plus Monthly — Monthly and Yearly tabs are available', () => {
      api.ensureLoggedIn('proPlusMonthly')
      api.openApiSection()
      api.assertEnterpriseUpsell()
      api.assertUpsellHasBillingTab('monthly')
      api.assertUpsellHasBillingTab('yearly')
    })

    it('Pro Plus Monthly — Get Monthly opens Stripe checkout', () => {
      api.ensureLoggedIn('proPlusMonthly')
      api.visitApiSection()
      api.switchUpsellBillingTab('monthly')
      api.assertGetPlanButton('monthly')
      api.clickGetPlanButton('monthly')
      api.assertStripeCheckoutOpens()
    })

    it('Pro Plus Monthly — Get Yearly opens Stripe checkout', () => {
      api.ensureLoggedIn('proPlusMonthly')
      api.visitApiSection()
      api.switchUpsellBillingTab('yearly')
      api.assertGetPlanButton('yearly')
      api.clickGetPlanButton('yearly')
      api.assertStripeCheckoutOpens()
    })

    it('Pro Plus Yearly — only Yearly plan, Get Yearly opens Stripe', () => {
      api.ensureLoggedIn('proPlusYearly')
      api.openApiSection()
      api.assertEnterpriseUpsell()
      api.assertUpsellMissingBillingTab('monthly')
      api.assertGetPlanButton('yearly')
      api.clickGetPlanButton('yearly')
      api.assertStripeCheckoutOpens()
    })
  })

  describe('E. Enterprise price consistency', () => {
    it('upsell prices match pricing-prices.json enterprise tier', () => {
      api.ensureLoggedIn('proPlusMonthly')
      api.openApiSection()
      cy.fixture('pricing-prices.json').then((fixture) => {
        api.assertEnterprisePricesMatchFixture(fixture, 'usd')
      })
    })
  })
})
