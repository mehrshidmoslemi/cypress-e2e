/**
 * ID-flow-test (Enhanced)
 *
 * Single flow: Login → Upload → Validation → Widget dependency →
 * Gen-1 (credit −1) → Before/After → Download → Feedback →
 * Regenerate (no credit deduction) → Bookmark
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  homeCard: '#v5-home-tool-interior-design',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-interior-design-generate-button',
  spaceLivingRoom: '#v5-tool-interior-design-space-living-room',
  spaceKidsRoom: '#v5-tool-interior-design-space-kids-room',
  styleIndustrial: '#v5-tool-interior-design-style-industrial',
  styleTraditional: '#v5-tool-interior-design-style-traditional',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'id-flow-user-10000',
  styleDropdownLabels: ['Industrial', 'Traditional', 'Modern', 'Contemporary'],
})

const openColorDropdownAndWait = (waitMs = 3000) => {
  flow.dismissBlockingModals()
  cy.contains('Color (Optional)').click({ force: true })
  cy.wait(waitMs)
  flow.closeOpenDropdown()
}

const openToolSidebar = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    const sidebarItem = $body.find('span.text-body-md.text-darkest').filter((_, el) =>
      el.textContent.includes('AI Interior Design'),
    )
    if (sidebarItem.length) {
      cy.wrap(sidebarItem.first())
        .closest('div.cursor-pointer.items-center.justify-between')
        .click({ force: true })
    } else {
      cy.contains('AI Interior Design', { timeout: 60000 }).click({ force: true })
    }
  })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

describe('ID-flow-test-enhanced', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

  it('completes full ID flow in a single generation', () => {
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
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/ID-test.jpg', { force: true })

      flow.waitForUploadComplete()
      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceStyleDependency(SEL.spaceLivingRoom, SEL.styleIndustrial)
      flow.dismissBlockingModals()
      flow.selectStyle(SEL.styleIndustrial)
      openColorDropdownAndWait(3000)

      flow.readCreditBalance().then((beforeGen1Credits) => {
        cy.log(`Credit before Gen-1: ${beforeGen1Credits}`)

        flow.clickGenerate()
        flow.waitForAllResultsReady()

        flow.assertCreditAfterAction(
          beforeGen1Credits,
          -1,
          'first generate should deduct 1 credit',
        ).then(() => {
          flow.runLoginFirstPostGen1({ upscale: true, feedbackMessage: 'Great interior design result. Layout and style look cohesive.' })

          openToolSidebar()
          flow.selectSpace(SEL.spaceKidsRoom, 1000)
          flow.selectStyle(SEL.styleTraditional)

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
