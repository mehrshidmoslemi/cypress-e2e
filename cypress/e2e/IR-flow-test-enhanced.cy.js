/**
 * IR-flow-test (Enhanced)
 *
 * Flow preserved: Upload required before generate
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
      flow.dismissBlockingModals()
      flow.loginViaProfile()
      flow.dismissBlockingModals()
    },
    {
      validate() {
        cy.visit('/')
        flow.dismissBlockingModals()
        cy.contains('span', 'Login', { timeout: 30000 }).should('not.exist')
      },
    },
  )

  cy.get('@irOrderUrl').then((orderUrl) => {
    cy.visit(orderUrl)
  })
  flow.dismissBlockingModals()
  cy.url({ timeout: 60000 }).should('include', 'order_id=')
}

describe('IR-flow-test-enhanced', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

  it('completes full IR flow in a single generation', () => {
    cy.clearCookies()
    cy.visit('/')
    flow.dismissBlockingModals()

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
      if ($body.find(SEL.generateBtn).length > 0) {
        flow.clickGenerate()
        flow.verifyValidationError()
        flow.dismissBlockingModals()
      } else {
        cy.log('Generate button hidden until upload — upload requirement verified')
      }
    })

    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/IR-test.jpg', { force: true })
    flow.waitForUploadComplete()
    flow.dismissBlockingModals()
    cy.get(SEL.generateBtn, { timeout: 60000 }).should('be.visible')

    flow.dismissBlockingModals()
    cy.get(SEL.generateBtn).scrollIntoView().should('be.visible').click({ force: true })
    cy.url({ timeout: 60000 }).should('include', 'order_id=')
    cy.url().as('irOrderUrl')
    flow.watchCreditApi('creditApi')
    loginViaHomepageAndReturn()
    flow.dismissBlockingModals()
    cy.wait('@creditApi', { timeout: 90000 })

    flow.readCreditBalance().then((creditsAfterLogin) => {
      cy.log(`Credit after login: ${creditsAfterLogin}`)

      flow.ensureGenerationStartedAfterLogin(SEL.generateBtn)
      flow.waitForAllResultsReady({ skipGenerateRetry: true })

      flow.assertCreditAfterAction(
        creditsAfterLogin,
        -1,
        'first generate should deduct 1 credit',
      ).then(() => {
        flow.runResultPageEnhancements({ upscale: true, feedbackMessage: 'Great item removal result. Object removal looks clean.' })

        openToolSidebar()

        flow.readCreditBalance().then((beforeGen2Credits) => {
          flow.clickGenerate()
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
