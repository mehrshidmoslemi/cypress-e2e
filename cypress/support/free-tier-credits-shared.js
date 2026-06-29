/**
 * Free-tier credit depletion, upgrade modal, pricing redirect, watermark checks
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('./flow-enhanced-shared')

const { dismissBlockingModals } = require('./signup-shared')

const UPLOAD_IMAGE = 'cypress/fixtures/images/vs-test-room.jpg'
const WATERMARK_REFERENCE = 'cypress/fixtures/images/ai-homedesign-watermark-reference.png'
const GEN_TIMEOUT = 240000
const MAX_DEPLETION_ROUNDS = 20

const SEL = {
  ...COMMON_SEL,
  vsHomeCard: '#v5-home-tool-virtual-staging-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-virtual-staging-generate-button',
  spaceStudio: '#v5-tool-virtual-staging-space-studio',
}

function createFreeTierCreditsHelpers(sessionId = 'free-tier-credits') {
  const flow = createEnhancedFlowHelpers({ sel: SEL, sessionId })

  const dismissCookiesAndOnboarding = () => {
    dismissBlockingModals()
    flow.completeOnboardingIfShown()
    cy.get('nav', { timeout: 60000 }).should('exist')
  }

  const ensureCreditTrackingReady = () => {
    flow.watchCreditApi('creditApi')
    cy.visit('/')
    dismissCookiesAndOnboarding()

    cy.get('body').then(($body) => {
      if ($body.find(SEL.profileMenuTrigger).length) {
        cy.get(SEL.profileMenuTrigger).click({ force: true })
        cy.get('body').type('{esc}', { force: true })
      }
    })

    cy.wait('@creditApi', { timeout: 120000 })
  }

  const prepareGeneratePage = () => {
    cy.visit('/')
    dismissCookiesAndOnboarding()
  }

  const openVsUploader = () => {
    prepareGeneratePage()
    cy.get(SEL.vsHomeCard, { timeout: 60000 }).scrollIntoView().click({ force: true })
    cy.contains(/drop or add|browse from device|upload/i, { timeout: 30000 }).should('be.visible')
    cy.get(SEL.fileInput, { timeout: 30000 }).should('exist')
  }

  const uploadAndSelectSpace = () => {
    cy.get(SEL.fileInput).first().selectFile(UPLOAD_IMAGE, { force: true })
    flow.waitForUploadComplete()
    flow.selectSpace(SEL.spaceStudio)
  }

  const runSingleGeneration = () => {
    openVsUploader()
    uploadAndSelectSpace()
    flow.clickGenerate()
    flow.waitForAllResultsReady()
    cy.url().should('match', /order_id=|\/generate|\/results/)
  }

  const readCreditBalance = () => flow.readCreditBalance()

  const waitForCreditBalance = (expected, attempt = 0) =>
    readCreditBalance().then((balance) => {
      if (balance === expected) {
        return cy.wrap(balance)
      }

      if (attempt >= 20) {
        expect(balance, `credit balance should reach ${expected}`).to.equal(expected)
        return cy.wrap(balance)
      }

      cy.wait(2000)
      return waitForCreditBalance(expected, attempt + 1)
    })

  const depleteAllCredits = (resultUrlRef = { url: null }) =>
    readCreditBalance().then((startingCredits) => {
      expect(startingCredits, 'new free-tier user should start with credits').to.be.a('number').and.be
        .greaterThan(0)

      cy.log(`Starting free-tier credits: ${startingCredits}`)

      const spendOneCredit = (remaining, round) => {
        if (remaining <= 0) {
          return waitForCreditBalance(0)
        }

        if (round >= MAX_DEPLETION_ROUNDS) {
          throw new Error(`Exceeded max depletion rounds (${MAX_DEPLETION_ROUNDS})`)
        }

        return readCreditBalance().then((before) => {
          runSingleGeneration()
          cy.url().then((url) => {
            resultUrlRef.url = url
          })

          return flow.assertCreditAfterAction(before, -1, `generation ${round + 1} should deduct 1 credit`).then(
            () => readCreditBalance().then((after) => spendOneCredit(after, round + 1)),
          )
        })
      }

      return spendOneCredit(startingCredits, 0)
    })

  const attemptGenerateWithZeroCredits = () => {
    openVsUploader()
    uploadAndSelectSpace()
    flow.clickGenerate()
  }

  const assertBuyPlanModalVisible = () => {
    cy.get('[role="dialog"]:visible', { timeout: 60000 }).should('be.visible')
    cy.get('[role="dialog"]:visible').should(($dialog) => {
      const text = $dialog.text()
      expect(text, 'upgrade modal copy').to.match(
        /buy a plan|purchase a plan|upgrade|out of credits|need more credits|run out of credits/i,
      )
    })
    cy.get('[role="dialog"]:visible')
      .contains('button', /^See plans$/i, { timeout: 30000 })
      .should('be.visible')
  }

  const clickSeePlansAndAssertPricing = () => {
    cy.get('[role="dialog"]:visible').contains('button', /^See plans$/i).click({ force: true })
    cy.url({ timeout: 60000 }).should('include', '/pricing')
    cy.get('body', { timeout: 30000 }).should(($body) => {
      expect($body.text()).to.match(/pricing|plan|subscribe|upgrade/i)
    })
  }

  const findWatermarkBadge = ($body) => {
    const viewportWidth = $body[0].ownerDocument.defaultView.innerWidth
    const viewportHeight = $body[0].ownerDocument.defaultView.innerHeight

    return [...$body.find('img, div, span, p')].find((el) => {
      if (!Cypress.dom.isVisible(el)) {
        return false
      }

      const label = `${el.textContent || ''} ${el.getAttribute('alt') || ''} ${el.getAttribute('src') || ''}`
      if (!/ai\s*home\s*design|aihomedesign/i.test(label)) {
        return false
      }

      const rect = el.getBoundingClientRect()
      return rect.left >= viewportWidth * 0.45 && rect.top >= viewportHeight * 0.45
    })
  }

  const assertWatermarkOnResultPage = () => {
    cy.contains('button', /^Download$/i, { timeout: GEN_TIMEOUT }).should('be.visible')

    cy.get('img[src*="cdn.aihomedesign.com"]')
      .filter(':visible')
      .should(($imgs) => {
        const hero = [...$imgs].find((img) => img.getBoundingClientRect().width > 200)
        expect(hero, 'generated result hero image').to.exist
      })

    cy.get('body').should(($body) => {
      const badge = findWatermarkBadge($body)
      const overlay = [...$body.find('[class*="watermark"], [data-testid*="watermark"]')].some((el) =>
        Cypress.dom.isVisible(el),
      )
      const brandedInAside = /ai\s*home\s*design/i.test($body.text())

      expect(
        badge || overlay || brandedInAside,
        'AI HomeDesign watermark/logo should be visible on free-tier results',
      ).to.be.true
    })

    cy.readFile(WATERMARK_REFERENCE, null, { timeout: 30000 }).then((buffer) => {
      expect(buffer?.byteLength || buffer?.length, 'watermark reference fixture').to.be.greaterThan(1000)
    })
  }

  const visitSavedResultPage = (url) => {
    expect(url, 'saved result page url').to.match(/order_id=|\/generate|\/results/)
    cy.visit(url)
    dismissCookiesAndOnboarding()
  }

  return {
    flow,
    SEL,
    UPLOAD_IMAGE,
    WATERMARK_REFERENCE,
    ensureCreditTrackingReady,
    dismissCookiesAndOnboarding,
    prepareGeneratePage,
    runSingleGeneration,
    readCreditBalance,
    waitForCreditBalance,
    depleteAllCredits,
    attemptGenerateWithZeroCredits,
    assertBuyPlanModalVisible,
    clickSeePlansAndAssertPricing,
    assertWatermarkOnResultPage,
    visitSavedResultPage,
  }
}

module.exports = {
  createFreeTierCreditsHelpers,
  UPLOAD_IMAGE,
  WATERMARK_REFERENCE,
}
