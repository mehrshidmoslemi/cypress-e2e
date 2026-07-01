/**
 * Pricing page — visit helpers, billing tabs, account sessions, modal assertions
 */

const { dismissBlockingModals } = require('./signup-shared')

const MODAL_TIMEOUT = 60000

const ACCOUNTS = {
  free: () => ({
    email: Cypress.env('PRICING_FREE_EMAIL') || 'memoslemi.sdstudio+1004@gmail.com',
    password: Cypress.env('PRICING_FREE_PASSWORD') || '12345678',
  }),
  restricted: () => ({
    email:
      Cypress.env('PRICING_RESTRICTED_EMAIL') ||
      Cypress.env('STUDIO_NO_PLAN_EMAIL') ||
      'memoslemi.sdstudio+52@gmail.com',
    password:
      Cypress.env('PRICING_RESTRICTED_PASSWORD') ||
      Cypress.env('STUDIO_NO_PLAN_PASSWORD') ||
      'mmmmmmmm',
  }),
  active: () => ({
    email: Cypress.env('PRICING_ACTIVE_EMAIL') || 'memoslemi.sdstudio+1010@gmail.com',
    password: Cypress.env('PRICING_ACTIVE_PASSWORD') || '12345678',
  }),
  activeMonthly: () => ({
    email: Cypress.env('PRICING_ACTIVE_MONTHLY_EMAIL') || 'memoslemi.sdstudio+10000@gmail.com',
    password: Cypress.env('PRICING_ACTIVE_MONTHLY_PASSWORD') || '12345678',
  }),
  activeYearly: () => ({
    email: Cypress.env('PRICING_ACTIVE_YEARLY_EMAIL') || 'memoslemi.sdstudio+1011@gmail.com',
    password: Cypress.env('PRICING_ACTIVE_YEARLY_PASSWORD') || '12345678',
  }),
  paidProPlus: () => ({
    email:
      Cypress.env('PRICING_PROPLUS_MONTHLY_EMAIL') ||
      Cypress.env('PRICING_PRICES_PRO_PLUS_MONTHLY_EMAIL') ||
      'memoslemi.sdstudio+proplusmonthly@gmail.com',
    password:
      Cypress.env('PRICING_PROPLUS_MONTHLY_PASSWORD') ||
      Cypress.env('PRICING_PRICES_PRO_PLUS_MONTHLY_PASSWORD') ||
      'mmmmmmmm',
  }),
}

const SUBSCRIBE_BUTTON_IDS = {
  monthly: [
    '#v5-pricing-monthly-pro-button',
    '#v5-pricing-monthly-pro-plus-button',
    '#v5-pricing-monthly-enterprise-button',
  ],
  yearly: [
    '#v5-pricing-yearly-pro-button',
    '#v5-pricing-yearly-pro-plus-button',
    '#v5-pricing-yearly-enterprise-button',
  ],
}

const ACTIVE_YEARLY_BUTTONS = [
  { id: '#v5-pricing-yearly-downgrade-pro-button', label: /^Downgrade$/i },
  { id: '#v5-pricing-yearly-credit-pack-pro-plus-button', label: /\+?\s*More Photos/i },
  { id: '#v5-pricing-yearly-upgrade-enterprise-button', label: /^Upgrade$/i },
]

const PLAN_IDS = {
  pro: '95142b572cf11eee3c6df7ec',
  'pro-plus': '95142b572cf11efa3c6df7ec',
  enterprise: '9515cf7369ce22772023bb14',
}

const MONTHLY_PLAN_IDS = {
  pro: '85142b572cf11eee3c6df7ec',
  'pro-plus': '72142b572cf11efa3c6df7cc',
  enterprise: '8515cf7369ce22772023bb14',
}

const tierToApiName = (tier) => tier

const pendingDowngradeButtonId = (cycle, tier) =>
  `#v5-pricing-${cycle}-downgrade-pending-${tier}-button`

const downgradeButtonId = (cycle, tier) => `#v5-pricing-${cycle}-downgrade-${tier}-button`

const CANCEL_DOWNGRADE_BUTTON_ID = '#v5-billing-cancel-downgrade-button'

const transitionForTier = (tier, { pending, noActivePlan }) => {
  if (noActivePlan) {
    return 'upgrade'
  }
  if (pending && tier === pending) {
    return 'downgrade-pending'
  }
  return 'downgrade'
}

const buildPersonalPlans = (cycle, state) => [
  {
    id: cycle === 'yearly' ? PLAN_IDS.pro : '85142b572cf11eee3c6df7ec',
    name: 'pro',
    title: 'pages_pricing_plan_pro_title',
    subtitle: 'pages_pricing_plan_pro_subtitle',
    is_recommended: false,
    enterprise: false,
    price_package: {
      symbol: '$',
      currency: 'usd',
      amount: cycle === 'yearly' ? '228.00' : '35.00',
      amount_per_month: cycle === 'yearly' ? '19.00' : '35.00',
      amount_per_photo: cycle === 'yearly' ? '0.63' : '1.17',
      credit: cycle === 'yearly' ? 360 : 30,
      credit_per_month: 30,
      plan_transition_type: transitionForTier('pro', state),
    },
    cycle,
    tools_access: 'global_all',
    roll_over: cycle === 'yearly',
    backup_storage: '6',
    api_access: false,
    features: [],
    badge_link: '',
    background_color: '',
  },
  {
    id: cycle === 'yearly' ? PLAN_IDS['pro-plus'] : '72142b572cf11efa3c6df7cc',
    name: 'pro-plus',
    title: 'pages_pricing_plan_pro_plus_title',
    subtitle: 'pages_pricing_plan_pro_plus_subtitle',
    is_recommended: true,
    enterprise: false,
    price_package: {
      symbol: '$',
      currency: 'usd',
      amount: cycle === 'yearly' ? '348.00' : '59.00',
      amount_per_month: cycle === 'yearly' ? '29.00' : '59.00',
      amount_per_photo: cycle === 'yearly' ? '0.36' : '0.74',
      credit: cycle === 'yearly' ? 960 : 80,
      credit_per_month: 80,
      plan_transition_type: transitionForTier('pro-plus', state),
    },
    cycle,
    tools_access: 'global_all',
    roll_over: cycle === 'yearly',
    backup_storage: '12',
    api_access: false,
    features: [],
    badge_link: '',
    background_color: '',
  },
]

const buildEnterprisePlans = (cycle, state) => [
  {
    id: cycle === 'yearly' ? PLAN_IDS.enterprise : '8515cf7369ce22772023bb14',
    name: 'enterprise',
    title: 'pages_pricing_plan_enterprise_title',
    subtitle: 'pages_pricing_plan_enterprise_subtitle',
    is_recommended: false,
    enterprise: true,
    price_packages: [
      {
        symbol: '$',
        currency: 'usd',
        amount: cycle === 'yearly' ? '588.00' : '99.00',
        amount_per_month: cycle === 'yearly' ? '49.00' : '99.00',
        amount_per_photo: cycle === 'yearly' ? '0.24' : '0.49',
        credit: cycle === 'yearly' ? 2400 : 200,
        credit_per_month: cycle === 'yearly' ? 200 : 200,
        plan_transition_type: transitionForTier('enterprise', state),
      },
    ],
    cycle,
    tools_access: 'global_all',
    roll_over: true,
    backup_storage: 'pages_pricing_unlimited',
    api_access: true,
    features: [],
    badge_link: '',
    background_color: '',
  },
]

function createPricingPageHelpers(sessionPrefix = 'pricing-page') {
  const visitOptions = { timeout: 120000, failOnStatusCode: true, retryOnStatusCodeFailure: true }
  const dismissStartup = () => {
    cy.get('body').then(($body) => {
      if ($body.text().includes('Accept all')) {
        cy.contains('button', 'Accept all').click({ force: true })
      }
    })

    cy.get('body').then(($body) => {
      if (!$body.text().includes('Which best describes you?')) {
        return
      }

      cy.get('[role="dialog"]:visible').then(($dialog) => {
        if ($dialog.text().includes('Other')) {
          cy.wrap($dialog).contains('Other').click({ force: true })
        }
      })

      cy.get('body', { timeout: 30000 }).then(($body2) => {
        if ($body2.text().includes('What are you trying to do today?')) {
          cy.contains('Just testing AIHomeDesign').click({ force: true })
          cy.contains("I'll explore on my own").click({ force: true })
        } else if ($body2.text().includes('Which best describes you?')) {
          cy.get('button[aria-label="Close"]').first().click({ force: true })
        }
      })
    })
  }

  const waitForPricingCards = () => {
    cy.get('[id^="v5-pricing-"][id$="-button"]', { timeout: 90000 }).should(
      'have.length.at.least',
      3,
    )
  }

  const visitPricingPrepared = () => {
    cy.visit('/pricing', visitOptions)
    dismissBlockingModals()
    dismissStartup()
    cy.wait(500)
    cy.contains('button, [role="tab"]', /monthly/i, { timeout: 60000 }).should('be.visible')
    waitForPricingCards()
  }

  const switchBillingTab = (cycle) => {
    const pattern = cycle === 'yearly' ? /yearly/i : /^monthly$/i
    cy.contains('button, [role="tab"]', pattern).click({ force: true })
    cy.wait(500)
    waitForPricingCards()
  }

  const loginWithEmail = (account) => {
    cy.contains('span', 'Login').click({ force: true })
    cy.contains('button', 'Login').click({ force: true })
    cy.get('#login-with-email-button').click({ force: true })
    cy.get('input[name="username"]').clear().type(account.email)
    cy.get('input[name="password"]').clear().type(account.password, { log: false })
    cy.get('#loginwithemail-login-button').click({ force: true })

    cy.get('body', { timeout: 90000 }).should(($body) => {
      const navLogin = [...$body.find('nav span, nav button, nav a')].some(
        (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
      )
      expect(navLogin, `should be logged in as ${account.email}`).to.be.false
    })
  }

  const ensureLoggedIn = (accountType) => {
    const accountGetter = ACCOUNTS[accountType]
    if (!accountGetter) {
      throw new Error(`Unknown account type: ${accountType}`)
    }
    const account = accountGetter()

    cy.session(
      `${sessionPrefix}:${accountType}:${account.email}`,
      () => {
        cy.clearCookies()
        cy.visit('/', visitOptions)
        dismissBlockingModals()
        loginWithEmail(account)
        dismissStartup()
      },
      {
        validate() {
          cy.visit('/', visitOptions)
          cy.get('nav', { timeout: 60000 }).should('exist')
          cy.get('body').should(($body) => {
            const navLogin = [...$body.find('nav span, nav button, nav a')].some(
              (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
            )
            expect(navLogin).to.be.false
          })
        },
      },
    )

    cy.visit('/pricing', visitOptions)
    dismissStartup()
  }

  const visibleDialog = () => cy.get('[role="dialog"]:visible').last()

  const assertLoginModal = () => {
    cy.contains('Welcome Back', { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const assertSubscribeOrUpgradeButtonsOnAllPlans = (cycle) => {
    const subscribeLabel = cycle === 'yearly' ? /^Get Yearly$/ : /^Get Monthly$/
    const upgradeLabel = /^Upgrade$/

    SUBSCRIBE_BUTTON_IDS[cycle].forEach((selector) => {
      cy.get(selector).should('be.visible').invoke('text').then((text) => {
        const normalized = text.trim().replace(/\s+/g, ' ')
        expect(
          subscribeLabel.test(normalized) || upgradeLabel.test(normalized),
          `${selector} should show Get ${cycle === 'yearly' ? 'Yearly' : 'Monthly'} or Upgrade`,
        ).to.be.true
      })
    })
  }

  const assertActivePlanMonthlyButtons = () => {
    cy.get('[id^="v5-pricing-monthly-"][id$="-button"]', { timeout: 90000 })
      .should('have.length', 3)
      .each(($btn) => {
        expect($btn.text().trim()).to.match(/^Downgrade$/i)
      })
  }

  const assertActivePlanYearlyButtons = () => {
    ACTIVE_YEARLY_BUTTONS.forEach(({ id, label }) => {
      cy.get(id)
        .should('be.visible')
        .invoke('text')
        .then((text) => {
          expect(text.trim()).to.match(label)
        })
    })
  }

  const assertSubscriptionModal = () => {
    cy.contains('button', /checkout/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const assertSubscriptionModalOrStripe = () => {
    cy.get('body', { timeout: MODAL_TIMEOUT }).should(($body) => {
      const hasCheckout = [...$body.find('button')].some(
        (button) => /checkout/i.test(button.textContent) && Cypress.dom.isVisible(button),
      )
      const hasStripe = [...$body.find('iframe')].some((iframe) =>
        /stripe/i.test(iframe.getAttribute('src') || ''),
      )

      expect(hasCheckout || hasStripe, 'subscription modal or Stripe checkout').to.be.true
    })
  }

  const proceedToStripeIfNeeded = () => {
    cy.get('body').then(($body) => {
      const checkoutBtn = [...$body.find('button')].find(
        (button) => /^checkout$/i.test(button.textContent.trim()) && Cypress.dom.isVisible(button),
      )

      if (checkoutBtn) {
        cy.wrap(checkoutBtn).click({ force: true })
      }
    })
  }

  const assertUpgradeModal = () => {
    visibleDialog().should('be.visible')
    visibleDialog().invoke('text').should('match', /upgrade/i)
  }

  const assertDowngradeModal = () => {
    visibleDialog().should('be.visible')
    visibleDialog().invoke('text').should('match', /downgrade/i)
  }

  const confirmDowngradeModal = () => {
    visibleDialog().within(() => {
      cy.contains('button', /confirm|downgrade|proceed|continue/i, { timeout: MODAL_TIMEOUT })
        .first()
        .click({ force: true })
    })
  }

  const assertNoDowngradeOrPendingButtons = (cycle) => {
    cy.get(`[id^="v5-pricing-${cycle}-downgrade-"][id$="-button"]`).should('not.exist')
    cy.get(`[id^="v5-pricing-${cycle}-downgrade-pending-"][id$="-button"]`).should('not.exist')
  }

  const assertNoActivePlanBillingControls = () => {
    assertCancelDowngradeNotVisible()
    cy.get('body').then(($body) => {
      ;[/cancel auto renewal/i, /change payment method/i].forEach((label) => {
        const button = [...$body.find('button')].find((el) => label.test(el.textContent || ''))
        if (button) {
          expect(
            button.disabled || button.getAttribute('aria-disabled') === 'true',
            `${button.textContent.trim()} should be disabled when there is no active plan`,
          ).to.be.true
        }
      })
    })
  }

  const visitPricingWithPaymentErrors = () => {
    cy.visit('/pricing', visitOptions)
    dismissBlockingModals()
    dismissStartup()
    cy.wait(500)
    cy.url({ timeout: MODAL_TIMEOUT }).should('include', '/pricing')
  }

  const visitBillingWithPaymentErrors = () => {
    cy.visit('/billing', visitOptions)
    dismissBlockingModals()
    dismissStartup()
    cy.wait(500)
    cy.url({ timeout: MODAL_TIMEOUT }).should('include', '/billing')
  }

  const interceptPaymentApiErrors = ({
    statusCode = 200,
    body = { error: 'token is malformed: token contains an invalid number of segments' },
  } = {}) => {
    const errorResponse = { statusCode, body }
    const catalogState = { pending: null, activeTier: null, noActivePlan: true }

    cy.intercept('GET', '**/v1/payment/account/plan**', errorResponse).as('mockPlanError')
    cy.intercept('GET', '**/v1/payment/account/credit**', errorResponse).as('mockCreditError')
    cy.intercept('GET', '**/v1/payment/account/subscription**', errorResponse).as(
      'mockSubscriptionError',
    )
    cy.intercept('GET', '**/v1/payment/account/latest-subscription-transaction**', errorResponse).as(
      'mockLatestTransactionError',
    )
    cy.intercept('GET', '**/v1/payment/plans/personal**cycle=monthly**', {
      body: buildPersonalPlans('monthly', catalogState),
    }).as('mockPersonalMonthly')
    cy.intercept('GET', '**/v1/payment/plans/personal**cycle=yearly**', {
      body: buildPersonalPlans('yearly', catalogState),
    }).as('mockPersonalYearly')
    cy.intercept('GET', '**/v1/payment/plans/enterprise**cycle=monthly**', {
      body: buildEnterprisePlans('monthly', catalogState),
    }).as('mockEnterpriseMonthly')
    cy.intercept('GET', '**/v1/payment/plans/enterprise**cycle=yearly**', {
      body: buildEnterprisePlans('yearly', catalogState),
    }).as('mockEnterpriseYearly')
  }

  const assertPricingPageDegradedGracefully = () => {
    cy.get('body').should('be.visible').invoke('text').should('not.equal', '')
    cy.get('nav', { timeout: MODAL_TIMEOUT }).should('exist')
    cy.get('[id^="v5-pricing-"][id$="-button"]', { timeout: MODAL_TIMEOUT }).should(
      'have.length.at.least',
      3,
    )
  }

  const assertBillingPageDegradedGracefully = () => {
    cy.get('body').should('be.visible').invoke('text').should('not.equal', '')
    cy.get('nav', { timeout: MODAL_TIMEOUT }).should('exist')
    cy.url({ timeout: MODAL_TIMEOUT }).should('include', '/billing')
  }

  const assertStripePresent = () => {
    cy.get('body', { timeout: MODAL_TIMEOUT }).should(($body) => {
      const hasStripeIframe = [...$body.find('iframe')].some((iframe) => {
        const src = iframe.getAttribute('src') || ''
        const name = iframe.getAttribute('name') || ''
        const title = iframe.getAttribute('title') || ''
        return /stripe/i.test(`${src}${name}${title}`)
      })

      expect(
        hasStripeIframe || /stripe|card number|payment method/i.test($body.text()),
        'Stripe checkout should be visible',
      ).to.be.true
    })
  }

  const clickCheckout = () => {
    cy.contains('button', /^Checkout$/i, { timeout: MODAL_TIMEOUT }).click({ force: true })
  }

  const visitBilling = () => {
    cy.visit('/billing', visitOptions)
    dismissBlockingModals()
    dismissStartup()
    cy.wait(500)
    cy.url({ timeout: MODAL_TIMEOUT }).should('include', '/billing')
    cy.contains(
      /active plan|payment history|renewal date|no active plan|subscribe to a plan/i,
      { timeout: MODAL_TIMEOUT },
    ).should('be.visible')
  }

  const interceptPlanState = ({
    pending = null,
    cycle = 'monthly',
    accountCycle = null,
    renewalCanceled = false,
    activeTier = 'enterprise',
    freeMonthGranted = false,
    promotionUsed = false,
    promotionEligible = null,
    expired = false,
  } = {}) => {
    const pendingPlanName = pending ? tierToApiName(pending) : null
    const resolvedAccountCycle = accountCycle ?? cycle
    const noActivePlan = expired
    const activePlanName = expired ? 'starter' : tierToApiName(activeTier)
    const planIdMap = resolvedAccountCycle === 'monthly' ? MONTHLY_PLAN_IDS : PLAN_IDS
    const activePlanId = expired ? '' : planIdMap[activeTier] || planIdMap.enterprise
    const state = {
      pending: expired ? null : pendingPlanName,
      activeTier: expired ? null : tierToApiName(activeTier),
      noActivePlan,
    }
    const isPromotionEligible =
      !expired &&
      (promotionEligible ??
        (resolvedAccountCycle === 'monthly' &&
          activePlanName !== 'enterprise' &&
          !renewalCanceled &&
          !promotionUsed &&
          !freeMonthGranted))

    const planBody = expired
      ? {
          active_plan_id: '',
          active_plan_name: 'starter',
          active_plan_title: 'pages_pricing_plan_starter_title',
          badge_link: '',
          background_color: '',
          cycle: resolvedAccountCycle,
          previous_plan_id: '',
          previous_plan_name: '',
          previous_plan_title: '',
          previous_plan_cycle: resolvedAccountCycle,
        }
      : {
          active_plan_id: activePlanId,
          active_plan_name: activePlanName,
          active_plan_title: `pages_pricing_plan_${activePlanName.replace(/-/g, '_')}_title`,
          badge_link: '',
          background_color: '',
          cycle: resolvedAccountCycle,
          previous_plan_id: pendingPlanName ? PLAN_IDS[pending] : PLAN_IDS.pro,
          previous_plan_name: pendingPlanName || 'pro',
          previous_plan_title: `pages_pricing_plan_${(pendingPlanName || 'pro').replace(/-/g, '_')}_title`,
          previous_plan_cycle: pendingPlanName ? cycle : 'monthly',
        }

    const creditBody = {
      user_id: '35fc4b3c-eb6c-4c74-8f76-59810e70b075',
      active_plan_id: expired ? '' : activePlanId,
      balance: expired ? 0 : 200,
      remaining_time: expired ? 0 : 30,
      total_time: resolvedAccountCycle === 'yearly' ? 365 : 30,
      test_balance: 0,
      test_remaining_time: -106751,
      test_time: 0,
      free_plan: expired,
      renewal_canceled: expired ? true : renewalCanceled,
      plan_expire_date: expired ? '2023-06-01T00:00:00Z' : '2027-05-26T08:27:11Z',
      total_test_duration: 0,
      free_month_granted: freeMonthGranted,
      free_month_promotion_used: promotionUsed,
      free_month_offer_available: isPromotionEligible,
      has_free_month_retention_offer: isPromotionEligible,
    }

    const subscriptionBody = {
      is_real_estate_permitted: !expired,
      can_display_renewal_failed_banner: expired,
      can_subscribe: expired,
      can_cancel_downgrade: Boolean(pendingPlanName) && !renewalCanceled && !expired,
      can_change_payment_method: !renewalCanceled && !expired,
      can_cancel_auto_renewal: !renewalCanceled && !expired,
      restricted_user: false,
      price_per_one_credit: 0.54,
      will_be_roll_overed: !expired,
      balance: expired ? 0 : 200,
      free_month_granted: freeMonthGranted,
      free_month_promotion_used: promotionUsed,
      can_show_free_month_promotion: isPromotionEligible,
      show_free_month_retention_offer: isPromotionEligible,
      free_month_retention_offer: isPromotionEligible ? { available: true, accepted: false } : null,
    }

    const latestTransactionBody = expired
      ? {
          price: 0,
          symbol: '$',
          currency: 'usd',
          current_plan_credit: 0,
          credit_plan_index: 0,
        }
      : {
          price: 0,
          symbol: '$',
          currency: 'usd',
          current_plan_credit: 2400,
          credit_plan_index: 0,
          ...(pendingPlanName
            ? {
                pending_downgrade_plan_name: pendingPlanName,
                pending_downgrade_plan_cycle: cycle,
              }
            : {}),
        }

    const blockMutations = { statusCode: 403, body: { error: 'blocked in e2e mock' } }

    cy.intercept('GET', '**/v1/payment/account/plan**', { body: planBody }).as('mockPlan')
    cy.intercept('GET', '**/v1/payment/account/credit**', { body: creditBody }).as('mockCredit')
    cy.intercept('GET', '**/v1/payment/account/subscription**', { body: subscriptionBody }).as(
      'mockSubscription',
    )
    cy.intercept('GET', '**/v1/payment/account/latest-subscription-transaction**', {
      body: latestTransactionBody,
    }).as('mockLatestTransaction')
    cy.intercept('GET', '**/v1/payment/plans/personal**cycle=monthly**', {
      body: buildPersonalPlans('monthly', state),
    }).as('mockPersonalMonthly')
    cy.intercept('GET', '**/v1/payment/plans/personal**cycle=yearly**', {
      body: buildPersonalPlans('yearly', state),
    }).as('mockPersonalYearly')
    cy.intercept('GET', '**/v1/payment/plans/enterprise**cycle=monthly**', {
      body: buildEnterprisePlans('monthly', state),
    }).as('mockEnterpriseMonthly')
    cy.intercept('GET', '**/v1/payment/plans/enterprise**cycle=yearly**', {
      body: buildEnterprisePlans('yearly', state),
    }).as('mockEnterpriseYearly')
    cy.intercept('POST', '**/v1/payment/**', blockMutations)
    cy.intercept('PUT', '**/v1/payment/**', blockMutations)
    cy.intercept('PATCH', '**/v1/payment/**', blockMutations)
    cy.intercept('DELETE', '**/v1/payment/**', blockMutations)
    cy.intercept('POST', '**/v1/payment/downgrade/cancel**', {
      statusCode: 200,
      body: { success: true },
    }).as('mockCancelDowngrade')
    cy.intercept('POST', '**/v1/payment/cancel**', {
      statusCode: 200,
      body: { success: true },
    }).as('mockCancelSubscription')
    cy.intercept('POST', '**/v1/payment/customer-retention**', {
      statusCode: 200,
      body: { success: true },
    }).as('mockCustomerRetention')
    cy.intercept('POST', '**/v1/payment/**/renewal/**', {
      statusCode: 200,
      body: { success: true },
    }).as('mockCancelAutoRenewal')
    cy.intercept('POST', '**/v1/payment/**/free**', {
      statusCode: 200,
      body: { success: true },
    }).as('mockFreeMonthOffer')
    cy.intercept('POST', '**/v1/payment/subscription/**', {
      statusCode: 200,
      body: { success: true },
    }).as('mockSubscriptionMutation')
  }

  const assertCancelDowngradeVisible = () => {
    cy.get('body', { timeout: MODAL_TIMEOUT }).then(($body) => {
      if ($body.find(CANCEL_DOWNGRADE_BUTTON_ID).filter(':visible').length) {
        cy.get(CANCEL_DOWNGRADE_BUTTON_ID).should('be.visible').and('not.be.disabled')
        return
      }

      cy.contains('button', /cancel downgrade/i, { timeout: MODAL_TIMEOUT })
        .should('be.visible')
        .and('not.be.disabled')
    })
  }

  const assertCancelDowngradeNotVisible = () => {
    cy.get(CANCEL_DOWNGRADE_BUTTON_ID).should('not.exist')
    cy.contains('button', /cancel downgrade/i).should('not.exist')
  }

  const clickCancelDowngrade = () => {
    cy.get('body').then(($body) => {
      if ($body.find(CANCEL_DOWNGRADE_BUTTON_ID).filter(':visible').length) {
        cy.get(CANCEL_DOWNGRADE_BUTTON_ID).click({ force: true })
        return
      }

      cy.contains('button', /cancel downgrade/i, { timeout: MODAL_TIMEOUT }).click({ force: true })
    })
  }

  const assertNormalDowngradeButton = (cycle, tier) => {
    cy.get(downgradeButtonId(cycle, tier), { timeout: MODAL_TIMEOUT }).should('be.visible')
    cy.get(pendingDowngradeButtonId(cycle, tier)).should('not.exist')
  }

  const assertAutoRenewalDisabled = () => {
    cy.contains('button', /cancel auto renewal/i, { timeout: MODAL_TIMEOUT })
      .should('be.visible')
      .and('be.disabled')
  }

  const assertAutoRenewalCanceled = () => {
    assertAutoRenewalDisabled()
  }

  const PROMOTION_TEXT =
    /free month|one month|100%\s*off|free credits on us|we don't want you to leave/i

  const hasPromotionModal = ($body) =>
    [...$body.find('[role="dialog"]:visible, .fixed.inset-0:visible')].some((dialog) =>
      PROMOTION_TEXT.test(dialog.textContent || ''),
    )

  const promotionDialog = () =>
    cy.contains('[role="dialog"]:visible, .fixed.inset-0:visible', PROMOTION_TEXT, {
      timeout: MODAL_TIMEOUT,
    })

  const assertPromotionModal = () => {
    promotionDialog().should('be.visible')
    promotionDialog().within(() => {
      cy.contains('button', /yes,\s*i'll take it|accept/i).should('be.visible')
      cy.contains('button', /no,\s*cancel my subscription|decline/i).should('be.visible')
    })
  }

  const assertNoPromotionModal = () => {
    cy.get('body').should(($body) => {
      expect(hasPromotionModal($body), 'promotion modal should not be visible').to.be.false
    })
  }

  const openCancelAutoRenewal = () => {
    cy.contains('button', /cancel auto renewal/i, { timeout: MODAL_TIMEOUT })
      .scrollIntoView()
      .click({ force: true })
  }

  const confirmTurnOffAutoRenewal = () => {
    cy.contains('button', /yes,\s*continue/i, { timeout: MODAL_TIMEOUT }).click({ force: true })
  }

  const fillCancelAutoRenewalFeedback = () => {
    cy.contains('[role="dialog"]:visible', /help us improve|would you like to share/i, {
      timeout: MODAL_TIMEOUT,
    })
      .find('textarea')
      .type('E2E feedback for cancel auto renewal flow.', { force: true })
  }

  const continueCancelAutoRenewalFeedback = () => {
    cy.contains('button', /continue to cancel/i, { timeout: MODAL_TIMEOUT }).click({ force: true })
  }

  const advanceToPromotionModal = () => {
    openCancelAutoRenewal()
    confirmTurnOffAutoRenewal()
    fillCancelAutoRenewalFeedback()
    continueCancelAutoRenewalFeedback()
    assertPromotionModal()
  }

  const clickCancelAutoRenewal = () => {
    openCancelAutoRenewal()
    confirmTurnOffAutoRenewal()
    fillCancelAutoRenewalFeedback()
    continueCancelAutoRenewalFeedback()
    cy.get('body', { timeout: MODAL_TIMEOUT }).then(($body) => {
      if (hasPromotionModal($body)) {
        clickPromotionDecline()
      }
    })
  }

  const clickPromotionAccept = () => {
    promotionDialog().contains('button', /yes,\s*i'll take it|accept/i).click({ force: true })
  }

  const clickPromotionDecline = () => {
    promotionDialog()
      .contains('button', /no,\s*cancel my subscription|decline/i)
      .click({ force: true })
  }

  const closePromotionModal = () => {
    promotionDialog().find('button').first().click({ force: true })
  }

  const assertPromotionModalClosed = () => {
    cy.get('body').should(($body) => {
      expect(hasPromotionModal($body), 'promotion modal should be closed').to.be.false
    })
  }

  const dismissThankYouOrSuccessModal = () => {
    cy.get('body').then(($body) => {
      const gotIt = [...$body.find('button')].find(
        (button) => /got it|thank you/i.test(button.textContent) && Cypress.dom.isVisible(button),
      )
      if (gotIt) {
        cy.wrap(gotIt).click({ force: true })
      }
    })
  }

  const completeCancelAutoRenewalAfterPromotion = () => {
    openCancelAutoRenewal()
    confirmTurnOffAutoRenewal()
    fillCancelAutoRenewalFeedback()
    continueCancelAutoRenewalFeedback()
    assertNoPromotionModal()
  }

  const assertAutoRenewalEnabled = () => {
    cy.contains('button', /cancel auto renewal/i, { timeout: MODAL_TIMEOUT })
      .should('be.visible')
      .and('not.be.disabled')
  }

  const assertTurnOffAutoRenewalDialog = () => {
    cy.get('[role="dialog"]:visible', { timeout: MODAL_TIMEOUT })
      .last()
      .invoke('text')
      .should('match', /turn off auto-renewal|auto-renewal/i)
    cy.contains('button', /yes,\s*continue/i).should('be.visible')
    cy.contains('button', /no,\s*go back/i).should('be.visible')
  }

  const exitTurnOffAutoRenewalDialog = () => {
    cy.contains('button', /no,\s*go back/i, { timeout: MODAL_TIMEOUT }).click({ force: true })
  }

  const readBillingCycle = () =>
    cy.get('body', { timeout: MODAL_TIMEOUT }).then(($body) => {
      const snippet = $body.text().slice(0, 1500)
      if (/active plan[\s\S]{0,160}\byearly\b/i.test(snippet)) {
        return 'yearly'
      }
      if (/active plan[\s\S]{0,160}\bmonthly\b/i.test(snippet) || /\bmonthly\b/i.test(snippet)) {
        return 'monthly'
      }
      return null
    })

  const isCancelAutoRenewalAvailable = ($body) =>
    [...$body.find('button')].some(
      (button) =>
        /cancel auto renewal/i.test(button.textContent) &&
        Cypress.dom.isVisible(button) &&
        !button.disabled,
    )

  const assertPendingPlanNotDowngradeable = (cycle, tier) => {
    const selector = pendingDowngradeButtonId(cycle, tier)
    cy.get(selector, { timeout: MODAL_TIMEOUT }).should('exist').then(($btn) => {
      const disabled = $btn.is(':disabled') || $btn.attr('aria-disabled') === 'true'

      if (disabled) {
        return
      }

      cy.wrap($btn).scrollIntoView().click({ force: true })
      cy.get('body', { timeout: 5000 }).should(($body) => {
        const downgradeDialog = [...$body.find('[role="dialog"]:visible')].find((dialog) =>
          /downgrade/i.test(dialog.textContent || ''),
        )
        expect(downgradeDialog, 'downgrade modal should not open for pending plan').to.be.undefined
      })
    })
  }

  const assertNoDowngradeModal = () => {
    cy.get('[role="dialog"]:visible').each(($dialog) => {
      expect($dialog.text()).not.to.match(/downgrade/i)
    })
  }

  const assertPendingDowngradeGuardModal = () => {
    cy.get('body', { timeout: 5000 }).should(($body) => {
      const confirmDialog = [...$body.find('[role="dialog"]:visible')].find(
        (dialog) =>
          /downgrade/i.test(dialog.textContent || '') &&
          !/downgrade in progress|already downgraded|got it/i.test(dialog.textContent || ''),
      )
      expect(confirmDialog, 'downgrade confirmation modal should not open').to.be.undefined
    })
  }

  const closeVisibleModal = () => {
    cy.get('body').type('{esc}', { force: true })
  }

  const dismissOpenOverlays = () => {
    cy.get('body').type('{esc}{esc}', { force: true })
  }

  return {
    ACCOUNTS,
    SUBSCRIBE_BUTTON_IDS,
    PLAN_IDS,
    pendingDowngradeButtonId,
    downgradeButtonId,
    visitPricingPrepared,
    visitBilling,
    switchBillingTab,
    ensureLoggedIn,
    interceptPlanState,
    assertLoginModal,
    assertSubscribeOrUpgradeButtonsOnAllPlans,
    assertActivePlanMonthlyButtons,
    assertActivePlanYearlyButtons,
    assertSubscriptionModal,
    assertSubscriptionModalOrStripe,
    proceedToStripeIfNeeded,
    assertUpgradeModal,
    assertDowngradeModal,
    confirmDowngradeModal,
    assertNoDowngradeOrPendingButtons,
    assertNoActivePlanBillingControls,
    interceptPaymentApiErrors,
    assertPricingPageDegradedGracefully,
    assertBillingPageDegradedGracefully,
    visitPricingWithPaymentErrors,
    visitBillingWithPaymentErrors,
    assertStripePresent,
    assertCancelDowngradeVisible,
    assertCancelDowngradeNotVisible,
    clickCancelDowngrade,
    openCancelAutoRenewal,
    confirmTurnOffAutoRenewal,
    fillCancelAutoRenewalFeedback,
    continueCancelAutoRenewalFeedback,
    advanceToPromotionModal,
    clickCancelAutoRenewal,
    completeCancelAutoRenewalAfterPromotion,
    dismissThankYouOrSuccessModal,
    assertNormalDowngradeButton,
    assertAutoRenewalDisabled,
    assertAutoRenewalEnabled,
    assertAutoRenewalCanceled,
    assertPromotionModal,
    assertNoPromotionModal,
    assertPromotionModalClosed,
    clickPromotionAccept,
    clickPromotionDecline,
    closePromotionModal,
    assertTurnOffAutoRenewalDialog,
    exitTurnOffAutoRenewalDialog,
    readBillingCycle,
    isCancelAutoRenewalAvailable,
    assertPendingPlanNotDowngradeable,
    assertNoDowngradeModal,
    assertPendingDowngradeGuardModal,
    clickCheckout,
    closeVisibleModal,
    waitForPricingCards,
    dismissOpenOverlays,
  }
}

module.exports = {
  createPricingPageHelpers,
  ACCOUNTS,
  PLAN_IDS,
  pendingDowngradeButtonId,
  downgradeButtonId,
}
