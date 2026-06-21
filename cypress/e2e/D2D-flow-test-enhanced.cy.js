/**
 * D2D-flow-test (Enhanced)
 *
 * Single flow: Login → Upload → Validation → Widget dependency →
 * Gen-1 (credit −1) → Before/After → Download → Feedback →
 * Regenerate (no credit deduction) → Bookmark
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  homeCard: '#v5-home-tool-day-to-dusk-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-day-to-dusk-generate-button',
  skyStyleTwilight: '#v5-tool-day-to-dusk-sky-style-twilight-without-cloud',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'd2d-flow-user-10000',

})

const selectSkyStyle = (skyStyleSelector) => {
  flow.dismissBlockingModals()
  cy.contains('span.text-title-sm', 'Sky Style').click({ force: true })
  cy.get(skyStyleSelector).click({ force: true })
  flow.closeOpenDropdown()
}

const openToolSidebar = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    const sidebarItem = $body.find('span.text-body-md.text-darkest').filter((_, el) =>
      el.textContent.includes('AI Day to Dusk'),
    )
    if (sidebarItem.length) {
      cy.wrap(sidebarItem.first())
        .closest('div.cursor-pointer.items-center.justify-between')
        .click({ force: true })
    } else {
      cy.contains('AI Day to Dusk', { timeout: 60000 }).click({ force: true })
    }
  })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

describe('D2D-flow-test-enhanced', () => {
  it('completes full D2D flow in a single generation', () => {
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
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/D2D-test.png', { force: true })

      flow.waitForUploadComplete()

      flow.dismissBlockingModals()

      flow.readCreditBalance().then((beforeGen1Credits) => {
        cy.log(`Credit before Gen-1: ${beforeGen1Credits}`)

        flow.clickGenerate()
        flow.waitForAllResultsReady()

        flow.assertCreditAfterAction(
          beforeGen1Credits,
          -1,
          'first generate should deduct 1 credit',
        ).then(() => {
          flow.runLoginFirstPostGen1({ upscale: false, feedbackMessage: 'Great day-to-dusk result. Sky transition looks natural.' })

          openToolSidebar()
          selectSkyStyle(SEL.skyStyleTwilight)

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
