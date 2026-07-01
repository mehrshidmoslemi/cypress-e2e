/**
 * Pricing prices — API source-of-truth capture, currency switching, DOM readers
 */

const { createPricingPageHelpers } = require('./pricing-page-shared')
const { dismissBlockingModals } = require('./signup-shared')

const MODAL_TIMEOUT = 60000
const TIERS = ['pro', 'pro-plus', 'enterprise']
const CYCLES = ['monthly', 'yearly']

const CURRENCY_CONFIG = {
  usd: { code: 'usd', symbol: '$', pricingPath: '/pricing', locale: 'en' },
  cad: { code: 'cad', symbol: 'C$', pricingPath: '/pricing', forceQueryCurrency: true },
  gbp: { code: 'gbp', symbol: '£', pricingPath: '/en-gb/pricing', locale: 'en-gb' },
  eur: { code: 'eur', symbol: '€', pricingPath: '/fr/pricing', locale: 'fr' },
}

const FREE_CURRENCIES = ['usd', 'cad', 'gbp', 'eur']

const PRICE_ACCOUNTS = {
  free: () => ({
    email: Cypress.env('PRICING_PRICES_FREE_EMAIL') || 'memoslemi.sdstudio+free@gmail.com',
    password: Cypress.env('PRICING_PRICES_FREE_PASSWORD') || '12345678',
  }),
  proMonthly: () => ({
    email: Cypress.env('PRICING_PRICES_PRO_MONTHLY_EMAIL') || 'memoslemi.sdstudio+promonthly@gmail.com',
    password: Cypress.env('PRICING_PRICES_PRO_MONTHLY_PASSWORD') || 'mmmmmmmm',
  }),
  proPlusMonthly: () => ({
    email:
      Cypress.env('PRICING_PRICES_PRO_PLUS_MONTHLY_EMAIL') ||
      'memoslemi.sdstudio+proplusmonthly@gmail.com',
    password: Cypress.env('PRICING_PRICES_PRO_PLUS_MONTHLY_PASSWORD') || 'mmmmmmmm',
  }),
  enterpriseMonthly: () => ({
    email:
      Cypress.env('PRICING_PRICES_ENTERPRISE_MONTHLY_EMAIL') ||
      'memoslemi.sdstudio+enterprisemonthlyy@gmail.com',
    password: Cypress.env('PRICING_PRICES_ENTERPRISE_MONTHLY_PASSWORD') || '12345678',
  }),
  proYearly: () => ({
    email: Cypress.env('PRICING_PRICES_PRO_YEARLY_EMAIL') || 'memoslemi.sdstudio+proyearly@gmail.com',
    password: Cypress.env('PRICING_PRICES_PRO_YEARLY_PASSWORD') || 'mmmmmmmm',
  }),
  proPlusYearly: () => ({
    email:
      Cypress.env('PRICING_PRICES_PRO_PLUS_YEARLY_EMAIL') ||
      'memoslemi.sdstudio+proplusyearly@gmail.com',
    password: Cypress.env('PRICING_PRICES_PRO_PLUS_YEARLY_PASSWORD') || '12345678',
  }),
  enterpriseYearly: () => ({
    email:
      Cypress.env('PRICING_PRICES_ENTERPRISE_YEARLY_EMAIL') ||
      'memoslemi.sdstudio+enterpriseyearlyy@gmail.com',
    password: Cypress.env('PRICING_PRICES_ENTERPRISE_YEARLY_PASSWORD') || '12345678',
  }),
}

const PAID_ACCOUNT_KEYS = [
  'proMonthly',
  'proPlusMonthly',
  'enterpriseMonthly',
  'proYearly',
  'proPlusYearly',
  'enterpriseYearly',
]

const TIER_RANK = { pro: 1, 'pro-plus': 2, enterprise: 3 }

const ACCOUNT_ACTIVE_TIER = {
  proMonthly: 'pro',
  proPlusMonthly: 'pro-plus',
  enterpriseMonthly: 'enterprise',
  proYearly: 'pro',
  proPlusYearly: 'pro-plus',
  enterpriseYearly: 'enterprise',
}

const ACCOUNT_ACTIVE_CYCLE = {
  proMonthly: 'monthly',
  proPlusMonthly: 'monthly',
  enterpriseMonthly: 'monthly',
  proYearly: 'yearly',
  proPlusYearly: 'yearly',
  enterpriseYearly: 'yearly',
}

const API_ENDPOINTS = {
  personalPlans: 'GET /v1/payment/plans/personal?currency={currency}&cycle={cycle}',
  enterprisePlans: 'GET /v1/payment/plans/enterprise?currency={currency}&cycle={cycle}',
  higherTier: 'GET /v1/payment/preview?plan_id={planId}&currency={currency} (upgrade modal)',
  accountCredit: 'GET /v1/payment/account/credit (paid account currency)',
}

const parseNumeric = (value) => {
  if (value == null || value === '') {
    return null
  }
  let normalized = String(value).replace(/[^\d.,-]/g, '')
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, '')
  } else if (/^\d+,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(',', '.')
  } else {
    normalized = normalized.replace(/,/g, '')
  }
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const stripSymbols = (text) => (text || '').replace(/[^\d.,-]/g, '').replace(/,/g, '')

const priceFromPackage = (pkg) => {
  if (!pkg) {
    return null
  }
  return {
    basePrice: parseNumeric(pkg.amount),
    displayedPrice: parseNumeric(pkg.amount_per_month ?? pkg.amount),
    currencySymbol: pkg.symbol || '',
    currencyCode: pkg.currency || '',
  }
}

const findPlanByTier = (plans, tier) => {
  if (!Array.isArray(plans)) {
    return null
  }
  return plans.find((plan) => plan.name === tier) || null
}

const pickEnterprisePackage = (plan, creditPlanIndex = 0) => {
  if (!plan) {
    return null
  }
  const packages = plan.price_packages || (plan.price_package ? [plan.price_package] : [])
  const list = Array.isArray(packages) ? packages : [packages]
  return list[creditPlanIndex] || list[0] || null
}

const upgradeButtonSelector = (cycle, tier) => `#v5-pricing-${cycle}-upgrade-${tier}-button`

const tierButtonSelector = (cycle, tier) =>
  [
    `#v5-pricing-${cycle}-${tier}-button`,
    `#v5-pricing-${cycle}-upgrade-${tier}-button`,
    `#v5-pricing-${cycle}-downgrade-${tier}-button`,
    `#v5-pricing-${cycle}-downgrade-pending-${tier}-button`,
    `#v5-pricing-${cycle}-credit-pack-${tier}-button`,
  ].join(', ')

const parseDiscountPercent = (text) => {
  const match = (text || '').match(/(\d+(?:\.\d+)?)\s*%/i)
  return match ? parseNumeric(match[1]) : null
}

function createPricingPricesHelpers(sessionPrefix = 'pricing-prices') {
  const pricing = createPricingPageHelpers(sessionPrefix)
  const visitOptions = { timeout: 120000, failOnStatusCode: true, retryOnStatusCodeFailure: true }

  const dismissStartup = () => {
    cy.get('body').then(($body) => {
      if ($body.text().includes('Accept all')) {
        cy.contains('button', 'Accept all').click({ force: true })
      }
    })

    cy.get('body', { timeout: 15000 }).then(($body) => {
      if (!$body.text().includes('Which best describes you?')) {
        return
      }

      cy.get('[role="dialog"]:visible', { timeout: 10000 }).then(($dialog) => {
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

  const ensurePricingReady = () => {
    dismissBlockingModals()
    dismissStartup()
    cy.wait(1000)
    dismissStartup()
    pricing.waitForPricingCards()
  }

  let capturedPersonal = []
  let capturedEnterprise = []
  let capturedUpgradePreview = null
  let capturedCredit = null
  let activeBillingCycle = null

  const resetCaptures = () => {
    capturedPersonal = []
    capturedEnterprise = []
    capturedUpgradePreview = null
    capturedCredit = null
    activeBillingCycle = null
  }

  const registerPriceApiCaptures = () => {
    cy.intercept('GET', '**/v1/payment/plans/personal**', (req) => {
      req.continue((res) => {
        capturedPersonal.push({ url: req.url, body: res.body })
      })
    }).as('capturePersonalPlans')

    cy.intercept('GET', '**/v1/payment/plans/enterprise**', (req) => {
      req.continue((res) => {
        capturedEnterprise.push({ url: req.url, body: res.body })
      })
    }).as('captureEnterprisePlans')

    cy.intercept('GET', '**/v1/payment/preview**', (req) => {
      req.continue((res) => {
        capturedUpgradePreview = res.body
      })
    }).as('captureUpgradePreview')

    cy.intercept('GET', '**/v1/payment/account/credit**', (req) => {
      req.continue((res) => {
        capturedCredit = res.body
      })
    }).as('captureCredit')
  }

  const forceCurrencyQuery = (currencyCode) => {
    cy.intercept('GET', '**/v1/payment/plans/**', (req) => {
      const url = new URL(req.url)
      url.searchParams.set('currency', currencyCode)
      req.url = url.toString()
      req.continue()
    })
  }

  const visitPricingDefault = () => {
    cy.visit('/pricing', visitOptions)
    ensurePricingReady()
    cy.get('[id^="v5-pricing-"][id$="-button"]', { timeout: MODAL_TIMEOUT }).should(
      'have.length.at.least',
      3,
    )
  }

  const visitPricingForCurrency = (currencyKey) => {
    const config = CURRENCY_CONFIG[currencyKey]
    if (!config) {
      throw new Error(`Unknown currency key: ${currencyKey}`)
    }

    if (config.forceQueryCurrency) {
      forceCurrencyQuery(config.code)
    }

    cy.visit(config.pricingPath, visitOptions)
    ensurePricingReady()
  }

  const switchBillingTab = (cycle) => {
    const pattern =
      cycle === 'yearly' ? /yearly|annuel|annual/i : /monthly|mensuel|mensual|mois/i
    cy.contains('button, [role="tab"]', pattern).click({ force: true })
    cy.wait(500)
    pricing.waitForPricingCards()
  }

  const ensureLoggedIn = (accountKey) => {
    const accountGetter = PRICE_ACCOUNTS[accountKey]
    if (!accountGetter) {
      throw new Error(`Unknown price account: ${accountKey}`)
    }
    const account = accountGetter()

    cy.session(
      `${sessionPrefix}:${accountKey}:${account.email}`,
      () => {
        cy.clearCookies()
        cy.visit('/', visitOptions)
        dismissBlockingModals()
        cy.contains('span', 'Login').click({ force: true })
        cy.contains('button', 'Login').click({ force: true })
        cy.get('#login-with-email-button').click({ force: true })
        cy.get('input[name="username"]').clear().type(account.email)
        cy.get('input[name="password"]').clear().type(account.password, { log: false })
        cy.get('#loginwithemail-login-button').click({ force: true })
        cy.get('body', { timeout: MODAL_TIMEOUT }).should(($body) => {
          const navLogin = [...$body.find('nav span, nav button, nav a')].some(
            (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
          )
          expect(navLogin, `should be logged in as ${account.email}`).to.be.false
        })
        dismissStartup()
      },
      {
        validate() {
          cy.visit('/', visitOptions)
          cy.get('nav', { timeout: MODAL_TIMEOUT }).should('exist')
          cy.get('nav').should(($nav) => {
            const navLogin = [...$nav.find('span, button, a')].some(
              (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
            )
            expect(navLogin, `session should stay logged in as ${account.email}`).to.be.false
          })
        },
      },
    )
  }

  const findCardContainer = (button) => {
    let el = button
    for (let depth = 0; depth < 10 && el; depth += 1) {
      const text = el.textContent || ''
      if (/(C\$|\$|£|€)\s*\d/.test(text) && text.length < 2500) {
        return el
      }
      el = el.parentElement
    }

    return (
      button.closest('[data-plan-name]') ||
      button.closest('article') ||
      button.closest('section') ||
      button.parentElement?.parentElement?.parentElement ||
      button
    )
  }

  const parsePriceFromText = (text) => {
    const splitMatch = text.match(/(C\$|\$|£|€)\s*(\d+)(?:\D{0,4}(\d{1,2}))?/)
    if (splitMatch) {
      const whole = splitMatch[2]
      const fraction = splitMatch[3]
      const amount = fraction ? `${whole}.${fraction}` : whole
      return {
        currencySymbol: splitMatch[1],
        displayedPrice: parseNumeric(amount),
      }
    }

    const tied = [...text.matchAll(/(C\$|\$|£|€)\s*(\d[\d.,]*(?:[.,]\d{1,2})?)/g)]
    if (tied.length) {
      return {
        currencySymbol: tied[0][1],
        displayedPrice: parseNumeric(tied[0][2]),
      }
    }

    const symbolMatch = text.match(/(C\$|\$|£|€)/)
    const amountMatches = [...text.matchAll(/(\d[\d,]*(?:\.\d{1,2})?)/g)].map((m) =>
      parseNumeric(m[1]),
    )

    return {
      currencySymbol: symbolMatch ? symbolMatch[1] : null,
      displayedPrice: amountMatches.length ? amountMatches[0] : null,
    }
  }

  const readDisplayedPriceFromDom = (cycle, tier) => {
    const selector = tierButtonSelector(cycle, tier)

    return cy
      .get('body')
      .find(selector)
      .filter(':visible')
      .first()
      .then(($button) => {
        if (!$button.length) {
          return {
            displayedPrice: null,
            currencySymbol: null,
            discountPercent: null,
            rawText: '',
          }
        }

        const root = findCardContainer($button.get(0))
        const text = root?.textContent || ''
        const htmlText = root?.innerHTML
          ? root.innerHTML
              .replace(/<br\s*\/?>/gi, ' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
          : text
        const sourceText = htmlText || text
        const parsed = parsePriceFromText(sourceText)

        return {
          displayedPrice: parsed.displayedPrice,
          currencySymbol: parsed.currencySymbol,
          discountPercent: parseDiscountPercent(text),
          rawText: text.slice(0, 400),
        }
      })
  }

  const readUpgradeDiscountFromDom = () =>
    cy
      .get('[role="dialog"]:visible', { timeout: MODAL_TIMEOUT })
      .filter((_index, el) => /upgrade|summary|discount|checkout/i.test(el.textContent || ''))
      .last()
      .should('be.visible')
      .then(($dialog) => {
        const text = $dialog.text() || ''
        return {
          discountPercent: parseDiscountPercent(text),
          rawText: text.slice(0, 600),
        }
      })

  const openUpgradeModalWithoutConfirm = (cycle, targetTier) => {
    capturedUpgradePreview = null
    return cy
      .get(upgradeButtonSelector(cycle, targetTier), { timeout: MODAL_TIMEOUT })
      .scrollIntoView()
      .click({ force: true })
      .then(() => {
        cy.get('[role="dialog"]:visible', { timeout: MODAL_TIMEOUT }).should('be.visible')
        cy.wait('@captureUpgradePreview', { timeout: MODAL_TIMEOUT, requestTimeout: MODAL_TIMEOUT })
      })
  }

  const closeUpgradeModal = () => cy.get('body').type('{esc}', { force: true })

  const latestPersonalForCycle = (cycle) => {
    const hit = [...capturedPersonal].reverse().find((entry) => entry.url.includes(`cycle=${cycle}`))
    return hit?.body || []
  }

  const latestEnterpriseForCycle = (cycle) => {
    const hit = [...capturedEnterprise]
      .reverse()
      .find((entry) => entry.url.includes(`cycle=${cycle}`))
    return hit?.body || []
  }

  const apiPriceForTier = (cycle, tier, creditPlanIndex = 0) => {
    if (tier === 'enterprise') {
      const enterprisePlan = findPlanByTier(latestEnterpriseForCycle(cycle), 'enterprise')
      return priceFromPackage(pickEnterprisePackage(enterprisePlan, creditPlanIndex))
    }
    const personalPlan = findPlanByTier(latestPersonalForCycle(cycle), tier)
    return priceFromPackage(personalPlan?.price_package)
  }

  const parseUpgradePreviewResponse = (body) => {
    if (!body || typeof body !== 'object') {
      return { basePrice: null, discountedPrice: null, discountPercent: null }
    }

    const discountedPrice =
      parseNumeric(body.total ?? body.total_amount ?? body.amount_due ?? body.payable_amount) ??
      parseNumeric(body.discounted_price ?? body.discount_price ?? body.final_price ?? body.price) ??
      parseNumeric(body.price_package?.amount) ??
      parseNumeric(body.price_package?.amount_per_month)

    const basePrice =
      parseNumeric(body.subtotal ?? body.original_amount ?? body.base_price ?? body.full_price) ??
      parseNumeric(body.price_package?.amount_before_discount ?? body.price_package?.amount)

    let discountPercent = parseNumeric(
      body.discount_percent ?? body.discount_percentage ?? body.discount_rate,
    )
    if (discountPercent == null) {
      discountPercent = parseNumeric(body.discount?.percent ?? body.discount?.percentage)
    }
    if (discountPercent == null && basePrice != null && discountedPrice != null && basePrice > 0) {
      discountPercent = Math.round(((basePrice - discountedPrice) / basePrice) * 100)
    }

    return { basePrice, discountedPrice, discountPercent }
  }

  const detectCurrencyFromCaptures = () => {
    const sampleUrl =
      capturedPersonal[capturedPersonal.length - 1]?.url ||
      capturedEnterprise[capturedEnterprise.length - 1]?.url
    const fromQuery = sampleUrl?.match(/[?&]currency=([a-z]+)/i)?.[1]
    if (fromQuery) {
      return String(fromQuery).toLowerCase()
    }

    const sample =
      capturedCredit?.currency ||
      latestPersonalForCycle('monthly')[0]?.price_package?.currency ||
      latestEnterpriseForCycle('monthly')[0]?.price_packages?.[0]?.currency ||
      latestPersonalForCycle('yearly')[0]?.price_package?.currency ||
      'usd'
    return String(sample).toLowerCase()
  }

  const syncBillingCycleFromDom = () =>
    cy.get('body').then(($body) => {
      const selectedTab = $body
        .find('[role="tab"][aria-selected="true"], button[aria-selected="true"]')
        .filter(':visible')
        .first()
      const label = selectedTab.text() || ''
      activeBillingCycle = /yearly|annuel|annual/i.test(label) ? 'yearly' : 'monthly'
      return activeBillingCycle
    })

  const captureTierBody = (cycle, tier, { activeTier = null, captureUpgrade = false } = {}) => {
    const creditPlanIndex = capturedCredit?.credit_plan_index ?? 0
    const api = apiPriceForTier(cycle, tier, creditPlanIndex)

    return readDisplayedPriceFromDom(cycle, tier).then((dom) => {
      const entry = {
        displayedPrice: api?.displayedPrice ?? null,
        basePrice: api?.basePrice ?? null,
        discountedPrice: null,
        discountPercent: null,
        currencySymbol: api?.currencySymbol || dom.currencySymbol || '',
        domDisplayedPrice: dom.displayedPrice,
        domDiscountPercent: dom.discountPercent,
      }

      return cy.get('body').then(($body) => {
        const hasUpgrade = $body.find(upgradeButtonSelector(cycle, tier)).filter(':visible').length
        if (
          !captureUpgrade ||
          !activeTier ||
          !hasUpgrade ||
          TIER_RANK[tier] <= TIER_RANK[activeTier]
        ) {
          return cy.wrap(entry)
        }

        return openUpgradeModalWithoutConfirm(cycle, tier).then(() =>
          readUpgradeDiscountFromDom().then((modalDom) => {
            const upgradeApi = parseUpgradePreviewResponse(capturedUpgradePreview)
            entry.basePrice = upgradeApi.basePrice ?? entry.basePrice
            entry.discountedPrice = upgradeApi.discountedPrice
            entry.discountPercent = upgradeApi.discountPercent ?? modalDom.discountPercent
            entry.domDiscountPercent = modalDom.discountPercent
            if (
              entry.discountPercent == null &&
              entry.basePrice != null &&
              entry.discountedPrice != null &&
              entry.basePrice > entry.discountedPrice
            ) {
              entry.discountPercent = Math.round(
                ((entry.basePrice - entry.discountedPrice) / entry.basePrice) * 100,
              )
            }
            return closeUpgradeModal().then(() => entry)
          }),
        )
      })
    })
  }

  const captureTierEntry = (cycle, tier, options = {}) => {
    if (activeBillingCycle === cycle) {
      return captureTierBody(cycle, tier, options)
    }

    switchBillingTab(cycle)
    activeBillingCycle = cycle
    return cy.wait(1000).then(() => captureTierBody(cycle, tier, options))
  }

  return {
    ...pricing,
    switchBillingTab,
    MODAL_TIMEOUT,
    TIERS,
    CYCLES,
    CURRENCY_CONFIG,
    FREE_CURRENCIES,
    PRICE_ACCOUNTS,
    PAID_ACCOUNT_KEYS,
    ACCOUNT_ACTIVE_TIER,
    ACCOUNT_ACTIVE_CYCLE,
    API_ENDPOINTS,
    parseNumeric,
    stripSymbols,
    registerPriceApiCaptures,
    resetCaptures,
    visitPricingForCurrency,
    visitPricingDefault,
    ensureLoggedIn,
    readDisplayedPriceFromDom,
    readUpgradeDiscountFromDom,
    openUpgradeModalWithoutConfirm,
    closeUpgradeModal,
    latestPersonalForCycle,
    latestEnterpriseForCycle,
    apiPriceForTier,
    parseUpgradePreviewResponse,
    detectCurrencyFromCaptures,
    syncBillingCycleFromDom,
    captureTierEntry,
    getCaptures: () => ({
      personal: capturedPersonal,
      enterprise: capturedEnterprise,
      upgradePreview: capturedUpgradePreview,
      credit: capturedCredit,
    }),
    upgradeButtonSelector,
    tierButtonSelector,
  }
}

module.exports = {
  createPricingPricesHelpers,
  CURRENCY_CONFIG,
  FREE_CURRENCIES,
  PRICE_ACCOUNTS,
  PAID_ACCOUNT_KEYS,
  ACCOUNT_ACTIVE_TIER,
  ACCOUNT_ACTIVE_CYCLE,
  TIERS,
  CYCLES,
  API_ENDPOINTS,
  parseNumeric,
  stripSymbols,
}
