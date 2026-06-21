/**
 * UC-flow-test (Enhanced)
 *
 * Single flow: Login → Upload → Validation → Widget dependency →
 * Gen-1 (credit −1) → Before/After → Download → Feedback →
 * Regenerate (no credit deduction) → Bookmark
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  homeCard: '#v5-home-tool-under-construction',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-under-construction-generate-button',
  spaceLivingRoom: '#v5-tool-under-construction-space-living-room',
  spaceOutdoor: '#v5-tool-under-construction-space-outdoor',
  styleContemporary: '#v5-tool-under-construction-style-contemporary',
  styleHampton: '#v5-tool-under-construction-style-hampton',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'uc-flow-user-10000',
  styleDropdownLabels: ['Contemporary', 'Hampton', 'Modern', 'Prime'],
})



const openToolSidebar = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    const sidebarItem = $body.find('span.text-body-md.text-darkest').filter((_, el) =>
      el.textContent.includes('AI Under Construction'),
    )
    if (sidebarItem.length) {
      cy.wrap(sidebarItem.first())
        .closest('div.cursor-pointer.items-center.justify-between')
        .click({ force: true })
    } else {
      cy.contains('AI Under Construction', { timeout: 60000 }).click({ force: true })
    }
  })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

describe('UC-flow-test-enhanced', () => {
  it('completes full UC flow in a single generation', () => {
    flow.watchCreditApi('creditApi')
    flow.ensureLoggedIn()
    cy.visit('/')
    cy.wait('@creditApi')
    cy.get('nav', { timeout: 60000 }).should('exist')
    cy.get(SEL.profileMenuTrigger, { timeout: 30000 }).should('exist')
    flow.dismissBlockingModals()

    flow.getCreditBalanceFromApi('creditApi').then(() => {
      flow.dismissBlockingModals()
      cy.get(SEL.homeCard).click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/UC-test.jpg', { force: true })

      flow.waitForUploadComplete()
      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceStyleDependency(SEL.spaceLivingRoom, SEL.styleContemporary)
      flow.dismissBlockingModals()
      flow.selectStyle(SEL.styleContemporary)

      flow.readCreditBalance().then((beforeGen1Credits) => {
        cy.log(`Credit before Gen-1: ${beforeGen1Credits}`)

        flow.clickGenerate()
        flow.waitForAllResultsReady()

        flow.assertCreditAfterAction(
          beforeGen1Credits,
          -1,
          'first generate should deduct 1 credit',
        ).then(() => {
          flow.runLoginFirstPostGen1({ upscale: true, feedbackMessage: 'Great under-construction result. Finish looks realistic.' })

          openToolSidebar()
          flow.selectSpace(SEL.spaceOutdoor, 1000)
          flow.selectStyle(SEL.styleHampton)

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
