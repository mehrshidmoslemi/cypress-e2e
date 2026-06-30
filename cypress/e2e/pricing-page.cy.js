/**
 * Pricing page — guest login prompt, plan CTAs by account type,
 * upgrade/downgrade modals, subscription checkout → Stripe
 *
 * Accounts (override via .env):
 *   PRICING_FREE_*       memoslemi.sdstudio+1004@gmail.com
 *   PRICING_RESTRICTED_* memoslemi.sdstudio+52@gmail.com (or STUDIO_NO_PLAN_*)
 *   PRICING_ACTIVE_*     memoslemi.sdstudio+1010@gmail.com
 */

const { createPricingPageHelpers } = require('../support/pricing-page-shared')

const pricing = createPricingPageHelpers()

describe('Pricing page', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  describe('Guest — not logged in', () => {
    beforeEach(() => {
      cy.clearCookies()
      pricing.visitPricingPrepared()
    })

    it('opens login modal when clicking a monthly plan button', () => {
      pricing.switchBillingTab('monthly')
      cy.get('#v5-pricing-monthly-pro-button').scrollIntoView().click({ force: true })
      pricing.assertLoginModal()
    })

    it('opens login modal when clicking a yearly plan button', () => {
      pricing.switchBillingTab('yearly')
      cy.get('#v5-pricing-yearly-pro-button').scrollIntoView().click({ force: true })
      pricing.assertLoginModal()
    })
  })

  describe('Free account — plan CTAs', () => {
    beforeEach(() => {
      pricing.ensureLoggedIn('free')
      pricing.visitPricingPrepared()
    })

    it('shows upgrade/subscribe CTAs on all plans in the monthly tab', () => {
      pricing.switchBillingTab('monthly')
      pricing.assertSubscribeOrUpgradeButtonsOnAllPlans('monthly')
    })

    it('shows upgrade/subscribe CTAs on all plans in the yearly tab', () => {
      pricing.switchBillingTab('yearly')
      pricing.assertSubscribeOrUpgradeButtonsOnAllPlans('yearly')
    })
  })

  describe('Restricted account — plan CTAs', () => {
    beforeEach(() => {
      pricing.ensureLoggedIn('restricted')
      pricing.visitPricingPrepared()
    })

    it('shows upgrade/subscribe CTAs on all plans in the monthly tab', () => {
      pricing.switchBillingTab('monthly')
      pricing.assertSubscribeOrUpgradeButtonsOnAllPlans('monthly')
    })

    it('shows upgrade/subscribe CTAs on all plans in the yearly tab', () => {
      pricing.switchBillingTab('yearly')
      pricing.assertSubscribeOrUpgradeButtonsOnAllPlans('yearly')
    })
  })

  describe('Active plan account — button labels', () => {
    beforeEach(() => {
      pricing.ensureLoggedIn('active')
      pricing.visitPricingPrepared()
    })

    it('shows Downgrade on all tiers in the monthly tab', () => {
      pricing.switchBillingTab('monthly')
      pricing.assertActivePlanMonthlyButtons()
    })

    it('shows Downgrade, +More Photos, and Upgrade in the yearly tab', () => {
      pricing.switchBillingTab('yearly')
      pricing.assertActivePlanYearlyButtons()
    })
  })

  describe('Active plan — upgrade and downgrade modals', () => {
    beforeEach(() => {
      pricing.ensureLoggedIn('active')
      pricing.visitPricingPrepared()
      pricing.switchBillingTab('yearly')
    })

    it('opens the upgrade modal when clicking Upgrade', () => {
      cy.get('#v5-pricing-yearly-upgrade-enterprise-button').scrollIntoView().click({ force: true })
      pricing.assertUpgradeModal()
    })

    it('opens the downgrade modal when clicking Downgrade', () => {
      cy.get('#v5-pricing-yearly-downgrade-pro-button').scrollIntoView().click({ force: true })
      pricing.assertDowngradeModal()
    })
  })

  describe('Free account — subscription checkout', () => {
    beforeEach(() => {
      pricing.ensureLoggedIn('free')
      pricing.visitPricingPrepared()
      pricing.dismissOpenOverlays()
    })

    it('Get Monthly opens subscription modal, Checkout opens Stripe', () => {
      pricing.switchBillingTab('monthly')
      cy.get('#v5-pricing-monthly-pro-button').scrollIntoView().click({ force: true })
      pricing.assertSubscriptionModal()
      pricing.clickCheckout()
      pricing.assertStripePresent()
    })

    it('Get Yearly opens subscription flow and Stripe checkout', () => {
      pricing.switchBillingTab('yearly')
      cy.get('#v5-pricing-yearly-pro-button').scrollIntoView().click({ force: true })
      pricing.assertSubscriptionModalOrStripe()
      pricing.proceedToStripeIfNeeded()
      pricing.assertStripePresent()
    })
  })
})
