/**
 * CC-flow-test (Enhanced)
 *
 * Single flow: Login → Upload → Validation → Widget dependency →
 * Gen-1 (credit −1) → Before/After → Download → Feedback →
 * Regenerate (no credit deduction) → Bookmark
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  homeCard: '#v5-home-tool-ceiling-change',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-ceiling-change-generate-button',
  spaceLivingRoom: '#v5-tool-ceiling-change-space-living-room',
  spaceOffice: '#v5-tool-ceiling-change-space-office',
  materialCofferedWooden: '#v5-tool-ceiling-change-material-coffered-wooden',
  materialWhiteCoffered: '#v5-tool-ceiling-change-material-white-coffered',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'cc-flow-user-10000',
  materialDropdownLabels: ['Wooden Ceiling', 'White Coffered', 'Coffered Wooden', 'Grey Marble'],
})



const openToolSidebar = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    const sidebarItem = $body.find('span.text-body-md.text-darkest').filter((_, el) =>
      el.textContent.includes('AI Ceiling Change'),
    )
    if (sidebarItem.length) {
      cy.wrap(sidebarItem.first())
        .closest('div.cursor-pointer.items-center.justify-between')
        .click({ force: true })
    } else {
      cy.contains('AI Ceiling Change', { timeout: 60000 }).click({ force: true })
    }
  })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

describe('CC-flow-test-enhanced', () => {
  it('completes full CC flow in a single generation', () => {
    flow.watchCreditApi('creditApi')
    flow.ensureLoggedIn()
    cy.visit('/')
    cy.wait('@creditApi')
    cy.get('nav', { timeout: 60000 }).should('exist')
    cy.get(SEL.profileMenuTrigger, { timeout: 30000 }).should('exist')
    flow.dismissBlockingModals()

    flow.getCreditBalanceFromApi('creditApi').then(() => {
      flow.dismissBlockingModals()
      cy.get(SEL.homeCard).scrollIntoView().click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/CC-test.jpeg', { force: true })

      flow.waitForUploadComplete()
      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceMaterialDependency(SEL.spaceLivingRoom, SEL.materialCofferedWooden)
      flow.dismissBlockingModals()
      flow.selectMaterial(SEL.materialCofferedWooden)

      flow.readCreditBalance().then((beforeGen1Credits) => {
        cy.log(`Credit before Gen-1: ${beforeGen1Credits}`)

        flow.clickGenerate()
        flow.waitForAllResultsReady()

        flow.assertCreditAfterAction(
          beforeGen1Credits,
          -1,
          'first generate should deduct 1 credit',
        ).then(() => {
          flow.runLoginFirstPostGen1({ upscale: true, feedbackMessage: 'Great ceiling result. Texture and lighting look realistic.' })

          openToolSidebar()
          flow.selectSpace(SEL.spaceOffice, 1000)
          flow.selectMaterial(SEL.materialWhiteCoffered)

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
