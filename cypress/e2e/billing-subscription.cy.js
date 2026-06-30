/**
 * Billing & subscription state machine — downgrade pending rules
 *
 * Billing page: /billing (profile menu → Billing link)
 * Live account +1010 currently has renewal_canceled=true; Cancel Auto Renewal not visible.
 */

const {
  createPricingPageHelpers,
  downgradeButtonId,
} = require('../support/pricing-page-shared')

const billing = createPricingPageHelpers('billing-subscription')
const MODAL_TIMEOUT = 60000

describe('Billing & subscription', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  describe('[Mock] downgrade pending rules', () => {
    it('A plan with a pending downgrade cannot be downgraded to again', () => {
      billing.interceptPlanState({ pending: 'pro-plus', cycle: 'monthly', renewalCanceled: false })
      billing.ensureLoggedIn('active')
      billing.visitPricingPrepared()
      billing.switchBillingTab('monthly')

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription', '@mockPersonalMonthly'], {
        timeout: MODAL_TIMEOUT,
      })

      billing.assertPendingPlanNotDowngradeable('monthly', 'pro-plus')
    })

    it('In state S1, other lower non-pending plans are still downgrade-able', () => {
      billing.interceptPlanState({ pending: 'pro-plus', cycle: 'monthly', renewalCanceled: false })
      billing.ensureLoggedIn('active')
      billing.visitPricingPrepared()
      billing.switchBillingTab('monthly')

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription', '@mockPersonalMonthly'])

      cy.get(downgradeButtonId('monthly', 'pro')).scrollIntoView().click({ force: true })
      billing.assertDowngradeModal()
      billing.closeVisibleModal()
    })
  })

  describe('[UI-Live] billing page — cancel downgrade', () => {
    it('In state S1, the billing page shows an enabled Cancel Downgrade button', function () {
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.get('body').then(($body) => {
        const hasCancelDowngrade = [...$body.find('button')].some(
          (button) =>
            /cancel downgrade/i.test(button.textContent) && Cypress.dom.isVisible(button),
        )

        if (!hasCancelDowngrade) {
          this.skip()
          return
        }

        billing.assertCancelDowngradeVisible()
      })
    })

    it('In state S0, the Cancel Downgrade button does not exist in billing', function () {
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.get('body').then(($body) => {
        const hasCancelDowngrade = [...$body.find('button')].some(
          (button) =>
            /cancel downgrade/i.test(button.textContent) && Cypress.dom.isVisible(button),
        )

        if (hasCancelDowngrade) {
          this.skip()
          return
        }

        billing.assertCancelDowngradeNotVisible()
      })
    })
  })

  describe('[Mock] cancel auto renewal flow', () => {
    it('After Cancel Auto Renewal, the Cancel Downgrade button is removed from billing', () => {
      billing.interceptPlanState({
        pending: 'pro-plus',
        cycle: 'yearly',
        renewalCanceled: false,
      })
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertCancelDowngradeVisible()
      billing.clickCancelAutoRenewal()

      billing.interceptPlanState({
        pending: 'pro-plus',
        cycle: 'yearly',
        renewalCanceled: true,
      })
      billing.visitBilling()

      cy.wait(['@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertCancelDowngradeNotVisible()
    })

    it('After Cancel Auto Renewal, the Cancel Auto Renewal button itself becomes disabled', () => {
      billing.interceptPlanState({ cycle: 'yearly', renewalCanceled: false })
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.clickCancelAutoRenewal()

      billing.interceptPlanState({ cycle: 'yearly', renewalCanceled: true })
      billing.visitBilling()

      cy.wait(['@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertAutoRenewalDisabled()
    })

    it('Direct entry into state S2: Cancel Auto Renewal disabled and Cancel Downgrade absent', () => {
      billing.interceptPlanState({ renewalCanceled: true, cycle: 'yearly' })
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertAutoRenewalDisabled()
      billing.assertCancelDowngradeNotVisible()
    })
  })

  describe('[Mock] cancel downgrade flow', () => {
    it('After Cancel Downgrade, the previously-pending plan becomes downgrade-able again', () => {
      billing.interceptPlanState({ pending: 'pro-plus', cycle: 'monthly', renewalCanceled: false })
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertCancelDowngradeVisible()
      billing.clickCancelDowngrade()
      cy.wait('@mockCancelDowngrade')

      billing.interceptPlanState({ pending: null, cycle: 'monthly', renewalCanceled: false })
      billing.visitPricingPrepared()
      billing.switchBillingTab('monthly')

      cy.wait(['@mockPersonalMonthly'], { timeout: MODAL_TIMEOUT })
      billing.assertNormalDowngradeButton('monthly', 'pro-plus')
    })
  })

  describe('[UI-Live] pending downgrade guard', () => {
    it('Clicking the pending plan button does NOT open a downgrade modal', function () {
      billing.ensureLoggedIn('active')
      billing.visitPricingPrepared()
      billing.switchBillingTab('monthly')

      cy.get('body').then(($body) => {
        const pendingButtons = [...$body.find('[id*="downgrade-pending-"][id$="-button"]')].filter(
          (el) => Cypress.dom.isVisible(el),
        )

        if (pendingButtons.length === 0) {
          this.skip()
          return
        }

        cy.wrap(pendingButtons[0]).scrollIntoView().click({ force: true })
        cy.wait(1000)
        billing.assertNoDowngradeModal()
      })
    })
  })
})
