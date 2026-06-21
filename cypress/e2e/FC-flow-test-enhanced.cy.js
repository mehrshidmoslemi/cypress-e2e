/**
 * FC-flow-test (Enhanced)
 *
 * Single flow: Login → Upload → Validation → Widget dependency →
 * Gen-1 (credit −1) → Before/After → Download → Feedback →
 * Regenerate (no credit deduction) → Bookmark
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  startNowLink: 'a[href="/generate"]',
  fcService: '[id="v5-services-page-AI Floor Change"]',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-floor-change-generate-button',
  spaceKitchen: '#v5-tool-floor-change-space-kitchen',
  spaceDiningRoom: '#v5-tool-floor-change-space-dining-room',
  materialCreamMarble: '#v5-tool-floor-change-material-cream-marble',
  materialBrownMarble: '#v5-tool-floor-change-material-brown-marble',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'fc-flow-user-10000',
  materialDropdownLabels: ['Cream Marble', 'Brown Marble', 'Grey Marble', 'Modern'],
})

const selectFCService = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    if ($body.find(SEL.fcService).length) {
      cy.get(SEL.fcService).click({ force: true })
      return
    }
    cy.contains('span.text-body-md.text-darkest', 'AI Floor Change')
      .closest('div.cursor-pointer')
      .click({ force: true })
  })
}

const openToolSidebar = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    const sidebarItem = $body.find('span.text-body-md.text-darkest').filter((_, el) =>
      el.textContent.includes('AI Floor Change'),
    )
    if (sidebarItem.length) {
      cy.wrap(sidebarItem.first())
        .closest('div.cursor-pointer.items-center.justify-between')
        .click({ force: true })
    } else {
      cy.contains('AI Floor Change', { timeout: 60000 }).click({ force: true })
    }
  })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

describe('FC-flow-test-enhanced', () => {
  it('completes full FC flow in a single generation', () => {
    flow.watchCreditApi('creditApi')
    flow.ensureLoggedIn()
    cy.visit('/')
    cy.wait('@creditApi')
    cy.get('nav', { timeout: 60000 }).should('exist')
    cy.get(SEL.profileMenuTrigger, { timeout: 30000 }).should('exist')
    flow.dismissBlockingModals()

    flow.getCreditBalanceFromApi('creditApi').then(() => {
      flow.dismissBlockingModals()
      cy.get(SEL.startNowLink).contains('Start Now').click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/FC-test.jpg', { force: true })
      selectFCService()

      flow.waitForUploadComplete()
      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceMaterialDependency(SEL.spaceKitchen, SEL.materialCreamMarble)
      flow.dismissBlockingModals()
      flow.selectMaterial(SEL.materialCreamMarble)

      flow.readCreditBalance().then((beforeGen1Credits) => {
        cy.log(`Credit before Gen-1: ${beforeGen1Credits}`)

        flow.clickGenerate()
        flow.waitForAllResultsReady()

        flow.assertCreditAfterAction(
          beforeGen1Credits,
          -1,
          'first generate should deduct 1 credit',
        ).then(() => {
          flow.runLoginFirstPostGen1({ upscale: true, feedbackMessage: 'Great floor change result. Material looks realistic.' })

          openToolSidebar()
          flow.selectSpace(SEL.spaceDiningRoom, 1000)
          flow.selectMaterial(SEL.materialBrownMarble)

          flow.readCreditBalance().then((beforeRegenCredits) => {
            cy.log(`Credit count before regenerate: ${beforeRegenCredits}`)

            flow.clickGenerate()
            flow.waitForAllResultsReady({ isRegenerate: true })

            flow.assertCreditAfterAction(
              beforeRegenCredits,
              0,
              'regenerate should NOT deduct any credits',
            ).then(() => {
              cy.log('Regenerate credit check passed')
              flow.manageBookmarks()
            })
          })
        })
      })
    })
  })
})
