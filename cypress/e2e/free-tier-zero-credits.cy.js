/**
 * Free-tier user — credit depletion, upgrade modal, pricing redirect, watermark
 *
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env
 * Fixture: cypress/fixtures/images/vs-test-room.jpg
 * Reference: cypress/fixtures/images/ai-homedesign-watermark-reference.png
 */

const { uniqueSignupEmail, completeSignupWithOtp } = require('../support/signup-shared')
const { createFreeTierCreditsHelpers } = require('../support/free-tier-credits-shared')

const credits = createFreeTierCreditsHelpers('free-tier-zero-credits')

describe('Free tier — zero credits, pricing modal, and watermark', { testIsolation: false }, () => {
  const savedResult = { url: null }
  let signupEmail = null

  before(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

  it('signs up and logs in a new free-tier user via email OTP', () => {
    signupEmail = uniqueSignupEmail('zero-credits')

    completeSignupWithOtp(signupEmail).then(({ email }) => {
      expect(email).to.equal(signupEmail)
    })

    credits.ensureCreditTrackingReady()

    credits.readCreditBalance().then((balance) => {
      expect(balance, 'new signup should receive free credits').to.be.a('number').and.be.greaterThan(0)
    })
  })

  it('depletes all free credits with repeated VS generations until balance is exactly 0', () => {
    credits.ensureCreditTrackingReady()
    credits.depleteAllCredits(savedResult).then((finalBalance) => {
      expect(finalBalance, 'credit balance after depletion').to.equal(0)
      expect(savedResult.url, 'last successful result page url').to.match(/order_id=|\/generate|\/results/)
    })
  })

  it('shows a buy-plan modal when generating with zero credits', () => {
    credits.ensureCreditTrackingReady()

    credits.readCreditBalance().then((balance) => {
      expect(balance, 'precondition: credits must be 0').to.equal(0)
    })

    credits.attemptGenerateWithZeroCredits()
    credits.assertBuyPlanModalVisible()
  })

  it('redirects to /pricing when clicking See plans in the upgrade modal', () => {
    credits.assertBuyPlanModalVisible()
    credits.clickSeePlansAndAssertPricing()
  })

  it('shows the AI HomeDesign watermark on free-tier generation result pages', () => {
    credits.visitSavedResultPage(savedResult.url)
    credits.assertWatermarkOnResultPage()
  })
})
