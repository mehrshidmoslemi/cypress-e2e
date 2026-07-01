/**
 * Billing & subscription state machine — downgrade pending rules
 *
 * Billing page: /billing (profile menu → Billing link)
 * UI-Live conditional skips replaced with interceptPlanState mocks so every test runs.
 */

const {
  createPricingPageHelpers,
  downgradeButtonId,
  pendingDowngradeButtonId,
} = require('../support/pricing-page-shared')

const billing = createPricingPageHelpers('billing-subscription')
const MODAL_TIMEOUT = 60000

const mockMonthlyPromotionEligible = (overrides = {}) =>
  billing.interceptPlanState({
    cycle: 'monthly',
    accountCycle: 'monthly',
    activeTier: 'pro-plus',
    renewalCanceled: false,
    ...overrides,
  })

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

  describe('[Mock] billing page — cancel downgrade', () => {
    it('In state S1, the billing page shows an enabled Cancel Downgrade button', () => {
      billing.interceptPlanState({ pending: 'pro-plus', cycle: 'monthly', renewalCanceled: false })
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertCancelDowngradeVisible()
    })

    it('In state S0, the Cancel Downgrade button does not exist in billing', () => {
      billing.interceptPlanState({ cycle: 'monthly', renewalCanceled: false })
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertCancelDowngradeNotVisible()
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

  describe('[Mock] pending downgrade guard', () => {
    it('Clicking the pending plan button does NOT open a downgrade modal', () => {
      billing.interceptPlanState({ pending: 'pro-plus', cycle: 'monthly', renewalCanceled: false })
      billing.ensureLoggedIn('active')
      billing.visitPricingPrepared()
      billing.switchBillingTab('monthly')

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription', '@mockPersonalMonthly'], {
        timeout: MODAL_TIMEOUT,
      })

      cy.get(pendingDowngradeButtonId('monthly', 'pro-plus'))
        .scrollIntoView()
        .click({ force: true })
      cy.wait(1000)
      billing.assertPendingDowngradeGuardModal()
    })
  })

  describe('[Mock] free-month promotion modal — open & close', () => {
    it("Monthly account: clicking Cancel Auto Renewal opens a 'one free month' promotion modal", () => {
      mockMonthlyPromotionEligible()
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.advanceToPromotionModal()
      billing.closePromotionModal()
      billing.assertPromotionModalClosed()
      billing.assertAutoRenewalEnabled()
    })

    it('Yearly account: clicking Cancel Auto Renewal does NOT open a promotion modal', () => {
      billing.interceptPlanState({
        cycle: 'yearly',
        accountCycle: 'yearly',
        renewalCanceled: false,
      })
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.openCancelAutoRenewal()
      billing.assertTurnOffAutoRenewalDialog()
      billing.assertNoPromotionModal()
      billing.exitTurnOffAutoRenewalDialog()
    })

    it('Closing the promotion modal with X has no effect', () => {
      mockMonthlyPromotionEligible()
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.advanceToPromotionModal()
      billing.closePromotionModal()
      billing.assertPromotionModalClosed()
      billing.assertAutoRenewalEnabled()
    })
  })

  describe('[Mock] free-month promotion modal', () => {
    it('Decline in the promotion modal → state goes to S2', () => {
      mockMonthlyPromotionEligible()
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.advanceToPromotionModal()
      billing.clickPromotionDecline()
      cy.wait('@mockCancelSubscription')

      mockMonthlyPromotionEligible({ renewalCanceled: true })
      billing.visitBilling()

      cy.wait(['@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertAutoRenewalDisabled()
      billing.assertCancelDowngradeNotVisible()
    })

    it('Accept in the promotion modal → one free month, auto renewal stays enabled', () => {
      mockMonthlyPromotionEligible()
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.advanceToPromotionModal()
      billing.clickPromotionAccept()
      cy.wait('@mockCustomerRetention')
      billing.dismissThankYouOrSuccessModal()

      mockMonthlyPromotionEligible({ freeMonthGranted: true, promotionUsed: true })
      billing.visitBilling()

      cy.wait(['@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertAutoRenewalEnabled()
    })

    it('Promotion is single-use: after Accept, clicking Cancel Auto Renewal again shows no promotion and cancels directly', () => {
      mockMonthlyPromotionEligible()
      billing.ensureLoggedIn('active')
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.advanceToPromotionModal()
      billing.clickPromotionAccept()
      cy.wait('@mockCustomerRetention')
      billing.dismissThankYouOrSuccessModal()

      mockMonthlyPromotionEligible({
        activeTier: 'enterprise',
        freeMonthGranted: true,
        promotionUsed: true,
      })
      billing.visitBilling()

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.completeCancelAutoRenewalAfterPromotion()
      cy.wait('@mockCancelSubscription')

      mockMonthlyPromotionEligible({ renewalCanceled: true, activeTier: 'pro-plus' })
      billing.visitBilling()

      cy.wait(['@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertAutoRenewalDisabled()
      billing.assertCancelDowngradeNotVisible()
    })
  })

  describe('[Mock] expired plan state', () => {
    it('When the backend reports an expired plan with auto renewal canceled, the UI correctly shows the user as having no active plan', () => {
      billing.interceptPlanState({ expired: true, cycle: 'monthly', accountCycle: 'monthly' })
      billing.ensureLoggedIn('active')
      billing.visitPricingPrepared()
      billing.switchBillingTab('monthly')

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription', '@mockPersonalMonthly'], {
        timeout: MODAL_TIMEOUT,
      })

      billing.assertSubscribeOrUpgradeButtonsOnAllPlans('monthly')
      billing.assertNoDowngradeOrPendingButtons('monthly')

      billing.visitBilling()
      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription'], { timeout: MODAL_TIMEOUT })
      billing.assertNoActivePlanBillingControls()
    })
  })

  describe('[Mock] pending downgrade replacement', () => {
    it('Changing your mind: downgrading to a different lower plan while a downgrade is already pending', () => {
      billing.interceptPlanState({
        pending: 'pro-plus',
        cycle: 'monthly',
        accountCycle: 'monthly',
        activeTier: 'enterprise',
      })
      billing.ensureLoggedIn('active')
      billing.visitPricingPrepared()
      billing.switchBillingTab('monthly')

      cy.wait(['@mockPlan', '@mockCredit', '@mockSubscription', '@mockPersonalMonthly'], {
        timeout: MODAL_TIMEOUT,
      })

      cy.get(pendingDowngradeButtonId('monthly', 'pro-plus'), { timeout: MODAL_TIMEOUT }).should(
        'exist',
      )

      cy.get(downgradeButtonId('monthly', 'pro')).scrollIntoView().click({ force: true })
      billing.assertDowngradeModal()
      billing.confirmDowngradeModal()
      billing.closeVisibleModal()

      billing.interceptPlanState({
        pending: 'pro',
        cycle: 'monthly',
        accountCycle: 'monthly',
        activeTier: 'enterprise',
      })
      billing.visitPricingPrepared()
      billing.switchBillingTab('monthly')

      cy.wait(['@mockPlan', '@mockPersonalMonthly'], { timeout: MODAL_TIMEOUT })
      cy.get(pendingDowngradeButtonId('monthly', 'pro'), { timeout: MODAL_TIMEOUT }).should('exist')
      billing.assertNormalDowngradeButton('monthly', 'pro-plus')
    })
  })

  describe('[Mock] payment API error resilience', () => {
    it('The pricing and billing pages do not crash when the plan API errors out', () => {
      billing.ensureLoggedIn('active')
      billing.interceptPaymentApiErrors()
      billing.visitPricingWithPaymentErrors()

      cy.wait(['@mockPlanError', '@mockCreditError', '@mockSubscriptionError'], {
        timeout: MODAL_TIMEOUT,
      })
      billing.assertPricingPageDegradedGracefully()

      billing.visitBillingWithPaymentErrors()
      cy.wait(['@mockPlanError', '@mockCreditError', '@mockSubscriptionError'], {
        timeout: MODAL_TIMEOUT,
      })
      billing.assertBillingPageDegradedGracefully()
    })
  })
})
