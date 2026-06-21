/**
 * FR-flow-test (Enhanced)
 *
 * Single flow: Login → Upload → Validation → Widget dependency →
 * Gen-1 (credit −1) → Before/After → Download → Feedback →
 * Regenerate (no credit deduction) → Bookmark
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  startNowLink: 'a[href="/generate"]',
  frService: '[id="v5-services-page-AI Furniture Restyle"]',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-furniture-restyle-generate-button',
  spaceBedroom: '#v5-tool-furniture-restyle-space-bedroom',
  spaceOffice: '#v5-tool-furniture-restyle-space-office',
  styleContemporary: '#v5-tool-furniture-restyle-style-contemporary',
  styleScandinavian: '#v5-tool-furniture-restyle-style-scandinavian',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'fr-flow-user-10000',
  styleDropdownLabels: ['Contemporary', 'Scandinavian', 'Modern', 'Prime'],
})

const selectFRService = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    if ($body.find(SEL.frService).length) {
      cy.get(SEL.frService).click({ force: true })
      return
    }
    cy.contains('span.text-body-md.text-darkest', 'AI Furniture Restyle')
      .closest('div.cursor-pointer')
      .click({ force: true })
  })
}

const openToolSidebar = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    const sidebarItem = $body.find('span.text-body-md.text-darkest').filter((_, el) =>
      el.textContent.includes('AI Furniture Restyle'),
    )
    if (sidebarItem.length) {
      cy.wrap(sidebarItem.first())
        .closest('div.cursor-pointer.items-center.justify-between')
        .click({ force: true })
    } else {
      cy.contains('AI Furniture Restyle', { timeout: 60000 }).click({ force: true })
    }
  })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

describe('FR-flow-test-enhanced', () => {
  it('completes full FR flow in a single generation', () => {
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
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/FR-test.jpg', { force: true })
      selectFRService()

      flow.waitForUploadComplete()
      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceStyleDependency(SEL.spaceBedroom, SEL.styleContemporary)
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
          flow.runLoginFirstPostGen1({ upscale: true, feedbackMessage: 'Great furniture restyle result. Style looks cohesive.' })

          openToolSidebar()
          flow.selectSpace(SEL.spaceOffice, 1000)
          flow.selectStyle(SEL.styleScandinavian)

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
