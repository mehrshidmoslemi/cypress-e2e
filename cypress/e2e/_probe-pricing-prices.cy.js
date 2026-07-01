/**
 * Probe — capture pricing API source-of-truth into cypress/fixtures/pricing-prices.json
 *
 * Currency mechanism (free account):
 *   - USD: /pricing (i18n locale en → usd)
 *   - GBP: /en-gb/pricing (locale en-gb → gbp)
 *   - EUR: /fr/pricing (locale fr → eur)
 *   - CAD: /pricing with cy.intercept rewriting plans API ?currency=cad (no locale route)
 *
 * Paid accounts: use /pricing; currency comes from GET /v1/payment/account/credit
 */

const {
  createPricingPricesHelpers,
  FREE_CURRENCIES,
  PAID_ACCOUNT_KEYS,
  ACCOUNT_ACTIVE_TIER,
  TIERS,
  CYCLES,
  API_ENDPOINTS,
} = require('../support/pricing-prices-shared')

const prices = createPricingPricesHelpers('probe-pricing-prices')

const compactEntry = (entry) => ({
  displayedPrice: entry.displayedPrice,
  basePrice: entry.basePrice,
  discountedPrice: entry.discountedPrice,
  discountPercent: entry.discountPercent,
  currencySymbol: entry.currencySymbol,
})

const chainEach = (items, fn) =>
  items.reduce((chain, item, index) => chain.then(() => fn(item, index)), cy.wrap(null, { log: false }))

describe('probe pricing prices', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  it('captures API pricing source-of-truth for all account states', () => {
    const fixture = {
      meta: {
        generatedAt: new Date().toISOString(),
        currencyMechanism: {
          free: {
            usd: 'Nuxt i18n route /pricing (locale en → usd)',
            gbp: 'Nuxt i18n route /en-gb/pricing (locale en-gb → gbp)',
            eur: 'Nuxt i18n route /fr/pricing (locale fr → eur)',
            cad: 'cy.intercept rewrites GET /v1/payment/plans/* query param currency=cad',
          },
          paid: 'Account currency from GET /v1/payment/account/credit (set at subscribe time)',
        },
        apiEndpoints: API_ENDPOINTS,
        schema:
          'accounts[accountKey][currencyCode][cycle][tier] → { displayedPrice, basePrice, discountedPrice, discountPercent, currencySymbol }',
      },
      accounts: {},
    }

    const captureFreeCurrency = (currencyKey) => {
      cy.log(`[probe] free / ${currencyKey}`)
      prices.resetCaptures()
      prices.registerPriceApiCaptures()
      prices.ensureLoggedIn('free')
      prices.visitPricingForCurrency(currencyKey)

      return cy
        .wait(['@capturePersonalPlans', '@captureEnterprisePlans'], {
          timeout: prices.MODAL_TIMEOUT,
        })
        .then(() => prices.syncBillingCycleFromDom())
        .then(() => {
          if (currencyKey === 'cad') {
            const personal = prices.latestPersonalForCycle('monthly')
            const apiCurrency =
              personal[0]?.price_package?.currency ||
              prices.latestEnterpriseForCycle('monthly')[0]?.price_packages?.[0]?.currency
            if (apiCurrency && String(apiCurrency).toLowerCase() !== 'cad') {
              cy.log(
                `[probe] CAD currency intercept did not apply (got ${apiCurrency}) — skipping free/cad`,
              )
              return
            }
          }

          fixture.accounts.free = fixture.accounts.free || {}
          fixture.accounts.free[currencyKey] = fixture.accounts.free[currencyKey] || {}

          return chainEach(CYCLES, (cycle) => {
            fixture.accounts.free[currencyKey][cycle] =
              fixture.accounts.free[currencyKey][cycle] || {}

            return chainEach(TIERS, (tier) =>
              prices.captureTierEntry(cycle, tier).then((entry) => {
                fixture.accounts.free[currencyKey][cycle][tier] = compactEntry(entry)
              }),
            )
          })
        })
    }

    const capturePaidAccount = (accountKey) => {
      cy.log(`[probe] paid / ${accountKey}`)
      prices.resetCaptures()
      prices.registerPriceApiCaptures()
      prices.ensureLoggedIn(accountKey)
      prices.visitPricingDefault()

      return cy
        .wait(['@capturePersonalPlans', '@captureEnterprisePlans', '@captureCredit'], {
          timeout: prices.MODAL_TIMEOUT,
        })
        .then(() => {
          const currencyKey = prices.detectCurrencyFromCaptures()
          fixture.accounts[accountKey] = fixture.accounts[accountKey] || {
            detectedCurrency: currencyKey,
          }
          fixture.accounts[accountKey].detectedCurrency = currencyKey

          const activeTier = ACCOUNT_ACTIVE_TIER[accountKey]

          return prices.syncBillingCycleFromDom().then(() =>
            chainEach(CYCLES, (cycle) => {
              fixture.accounts[accountKey][currencyKey] =
                fixture.accounts[accountKey][currencyKey] || {}
              fixture.accounts[accountKey][currencyKey][cycle] =
                fixture.accounts[accountKey][currencyKey][cycle] || {}

              return chainEach(TIERS, (tier) =>
                prices
                  .captureTierEntry(cycle, tier, {
                    activeTier,
                    captureUpgrade: true,
                  })
                  .then((entry) => {
                    fixture.accounts[accountKey][currencyKey][cycle][tier] = compactEntry(entry)
                  }),
              )
            }),
          )
        })
    }

    chainEach(FREE_CURRENCIES, captureFreeCurrency)
      .then(() => chainEach(PAID_ACCOUNT_KEYS, capturePaidAccount))
      .then(() => {
        fixture.meta.detectedPaidCurrencies = Object.fromEntries(
          PAID_ACCOUNT_KEYS.map((key) => [key, fixture.accounts[key]?.detectedCurrency || null]),
        )
        cy.log('[probe] writing pricing-prices.json')
        cy.writeFile('cypress/fixtures/pricing-prices.json', fixture)
      })
  })
})
