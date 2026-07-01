/**
 * Pricing prices — verify displayed plan prices and upgrade discounts match API fixture
 */

const {
  createPricingPricesHelpers,
  FREE_CURRENCIES,
  PAID_ACCOUNT_KEYS,
  ACCOUNT_ACTIVE_TIER,
  CURRENCY_CONFIG,
  TIERS,
  CYCLES,
} = require('../support/pricing-prices-shared')

const prices = createPricingPricesHelpers('pricing-prices-verify')

const TIER_RANK = { pro: 1, 'pro-plus': 2, enterprise: 3 }

const contextLabel = (account, currency, cycle, tier) =>
  `[${account} / ${currency} / ${cycle} / ${tier}]`

const assertTierAgainstFixture = (account, currency, cycle, tier, expected, dom) => {
  const label = contextLabel(account, currency, cycle, tier)
  const expectedSymbol = expected.currencySymbol || CURRENCY_CONFIG[currency]?.symbol || ''

  expect(expectedSymbol, `${label} fixture currencySymbol`).to.be.a('string')
  expect(dom.currencySymbol, `${label} DOM currency symbol`).to.eq(expectedSymbol)
  expect(dom.displayedPrice, `${label} displayed price`).to.eq(expected.displayedPrice)
}

describe('Pricing prices', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  const verifyTier = (accountKey, currencyKey, cycle, tier, expected, activeTier = null) => {
    prices.switchBillingTab(cycle)
    cy.wait(1000)

    const upgradeCheck =
      activeTier &&
      expected.discountPercent != null &&
      TIER_RANK[tier] > TIER_RANK[activeTier]
        ? cy.get('body').then(($body) => {
            const hasUpgrade = $body
              .find(prices.upgradeButtonSelector(cycle, tier))
              .filter(':visible').length
            if (!hasUpgrade) {
              return cy.wrap(null)
            }
            return prices.openUpgradeModalWithoutConfirm(cycle, tier).then(() =>
              prices.readUpgradeDiscountFromDom().then((modalDom) => {
                expect(
                  modalDom.discountPercent,
                  `${contextLabel(accountKey, currencyKey, cycle, tier)} upgrade discount %`,
                ).to.eq(expected.discountPercent)
                return prices.closeUpgradeModal()
              }),
            )
          })
        : cy.wrap(null)

    return upgradeCheck.then(() =>
      prices.readDisplayedPriceFromDom(cycle, tier).then((dom) => {
        assertTierAgainstFixture(accountKey, currencyKey, cycle, tier, expected, dom)
      }),
    )
  }

  describe('Free account — all currencies', () => {
    FREE_CURRENCIES.forEach((currencyKey) => {
      CYCLES.forEach((cycle) => {
        TIERS.forEach((tier) => {
          it(`free ${currencyKey} ${cycle} ${tier} matches API fixture`, function () {
            cy.fixture('pricing-prices.json').then((fixture) => {
              const expected = fixture?.accounts?.free?.[currencyKey]?.[cycle]?.[tier]
              if (!expected?.displayedPrice) {
                cy.log(
                  `No fixture for free/${currencyKey}/${cycle}/${tier} — currency may be unsupported, skipping`,
                )
                this.skip()
                return
              }

              prices.resetCaptures()
              prices.registerPriceApiCaptures()
              prices.ensureLoggedIn('free')
              prices.visitPricingForCurrency(currencyKey)
              cy.wait(['@capturePersonalPlans', '@captureEnterprisePlans'])
              prices.syncBillingCycleFromDom()

              verifyTier('free', currencyKey, cycle, tier, expected)
            })
          })
        })
      })
    })
  })

  describe('Paid accounts — account currency only', () => {
    PAID_ACCOUNT_KEYS.forEach((accountKey) => {
      CYCLES.forEach((cycle) => {
        TIERS.forEach((tier) => {
          it(`${accountKey} ${cycle} ${tier} matches API fixture`, function () {
            cy.fixture('pricing-prices.json').then((fixture) => {
              const currencyKey = fixture?.accounts?.[accountKey]?.detectedCurrency
              if (!currencyKey) {
                this.skip()
                return
              }

              const expected = fixture?.accounts?.[accountKey]?.[currencyKey]?.[cycle]?.[tier]
              if (!expected?.displayedPrice) {
                cy.log(`No fixture for ${accountKey}/${currencyKey}/${cycle}/${tier} — skipping`)
                this.skip()
                return
              }

              prices.resetCaptures()
              prices.registerPriceApiCaptures()
              prices.ensureLoggedIn(accountKey)
              prices.visitPricingDefault()
              cy.wait(['@capturePersonalPlans', '@captureEnterprisePlans', '@captureCredit'])
              prices.syncBillingCycleFromDom()

              verifyTier(
                accountKey,
                currencyKey,
                cycle,
                tier,
                expected,
                ACCOUNT_ACTIVE_TIER[accountKey],
              )
            })
          })
        })
      })
    })
  })
})
