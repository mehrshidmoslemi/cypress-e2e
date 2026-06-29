/**
 * IR-flow-test (Enhanced)
 *
 * Flow: Upload → Generate (guest) → Login → Resume Generate → Results → Regenerate
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  homeCard: '#v5-home-tool-item-removal-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-service-item-removal-generate-button',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'ir-flow-user-10000',
})

const enablePointerEvents = () => {
  cy.window().then((win) => {
    win.document.querySelectorAll('.pointer-events-none').forEach((el) => {
      el.style.setProperty('pointer-events', 'auto', 'important')
    })
  })
}

const clickIrGenerate = () => {
  cy.get('body').then(($body) => {
    if ($body.find(SEL.generateBtn).filter(':visible').length > 0) {
      cy.get(SEL.generateBtn).filter(':visible').first().scrollIntoView().click({ force: true })
      return
    }

    cy.contains('button', 'Generate', { timeout: 30000 })
      .filter(':visible')
      .scrollIntoView()
      .click({ force: true })
  })
}

const clickIrGenerateAndWaitToStart = () => {
  clickIrGenerate()
  cy.get('body', { timeout: 60000 }).should(($body) => {
    const started =
      /generating/i.test($body.text()) ||
      $body.find(SEL.downloadBtn).filter(':visible').length > 0
    expect(started, 'generation should start after Generate click').to.be.true
  })
}

const openToolSidebar = () => {
  cy.contains('span.text-body-md.text-darkest', 'AI Item Removal')
    .closest('div.cursor-pointer.items-center.justify-between')
    .should('be.visible')
    .click({ force: true })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

const loginViaHomepageAndReturn = () => {
  cy.session(
    'ir-flow-user-10000',
    () => {
      cy.visit('/')
      flow.prepareSiteForTesting()
      flow.loginViaProfile()
      flow.prepareSiteForTesting()
    },
    {
      validate() {
        cy.visit('/')
        cy.get(SEL.profileMenuTrigger, { timeout: 30000 }).should('be.visible')
      },
    },
  )

  cy.get('@irOrderUrl').then((orderUrl) => {
    cy.visit(orderUrl)
  })
  cy.url({ timeout: 60000 }).should('include', 'order_id=')
}

describe('IR-flow-test-enhanced', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
      if (err.message.includes('rate limit exceeded')) {
        return false
      }
    })
  })

  it('completes full IR flow in a single generation', () => {
    cy.clearCookies()
    cy.visit('/')
    flow.prepareSiteForTesting()

    cy.get(SEL.homeCard).click({ force: true })

    cy.log('Testing upload required before generate...')
    cy.get('body').should(($body) => {
      const text = $body.text().toLowerCase()
      expect(
        text.includes('upload') || text.includes('drop') || text.includes('browse'),
        'upload prompt should be visible before image is added',
      ).to.be.true
    })
    cy.get('body').then(($body) => {
      const visibleGenerate =
        $body.find(SEL.generateBtn).filter(':visible').length > 0 ||
        [...$body.find('button')].some(
          (btn) => btn.textContent.trim() === 'Generate' && Cypress.dom.isVisible(btn),
        )

      if (visibleGenerate) {
        clickIrGenerate()
        flow.verifyValidationError()
      } else {
        cy.log('Generate button hidden until upload — upload requirement verified')
      }
    })

    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/IR-test.jpg', { force: true })
    flow.waitForUploadComplete()
    enablePointerEvents()
    cy.get(SEL.generateBtn, { timeout: 60000 }).should('be.visible')

    clickIrGenerate()
    cy.url({ timeout: 60000 }).should('include', 'order_id=')
    cy.url().as('irOrderUrl')
    flow.watchCreditApi('creditApi')
    loginViaHomepageAndReturn()
    cy.wait('@creditApi', { timeout: 90000 })

    flow.readCreditBalance().then((creditsAfterLogin) => {
      cy.log(`Credit after login: ${creditsAfterLogin}`)

      clickIrGenerateAndWaitToStart()
      flow.waitForAllResultsReady({ skipGenerateRetry: true })

      flow.assertCreditAfterAction(
        creditsAfterLogin,
        -1,
        'first generate should deduct 1 credit',
      ).then(() => {
        flow.runResultPageEnhancements({
          upscale: true,
          feedbackMessage: 'Great item removal result. Object removal looks clean.',
        })

        openToolSidebar()

        flow.readCreditBalance().then((beforeGen2Credits) => {
          clickIrGenerateAndWaitToStart()
          flow.waitForAllResultsReady({ isRegenerate: true })

          flow.assertCreditAfterAction(
            beforeGen2Credits,
            0,
            'second generate should NOT deduct any credits',
          ).then(() => {
            flow.manageBookmarks()
          })
        })
      })
    })
  })
})
