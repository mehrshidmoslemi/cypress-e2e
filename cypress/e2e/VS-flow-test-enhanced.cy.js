/**
 * VS-flow-test (Enhanced)
 *
 * Flow preserved: Upload → Validation → Widget dependency → Gen-1 → Login → enhanced result page checks → Gen-2
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  homeCard: '#v5-home-tool-virtual-staging-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-virtual-staging-generate-button',
  restageGenerateBtn: '#v5-tool-virtual-restaging-generate-button',
  spaceStudio: '#v5-tool-virtual-staging-space-studio',
  styleHampton: '#v5-tool-virtual-staging-style-hampton',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'vs-flow-user-10000',
  styleDropdownLabels: ['Prime', 'Modern', 'Hampton', 'Contemporary', 'Scandinavian'],
})

const selectSpaceById = (spaceId, waitMs = 1000) => {
  flow.dismissBlockingModals()
  cy.contains('Space').parents().find('button span.i-tabler\\:chevron-down').first().click({ force: true })
  cy.wait(waitMs)
  cy.get(`#${spaceId}`).click({ force: true })
  flow.closeOpenDropdown()
}

const selectStyleById = (styleId) => {
  flow.dismissBlockingModals()
  cy.get('button').then(($buttons) => {
    const styleLabels = ['Prime', 'Modern', 'Hampton', 'Contemporary', 'Scandinavian']
    const target = [...$buttons].find((button) =>
      styleLabels.some((label) => button.innerText.trim().includes(label)),
    )
    expect(target, 'style dropdown button').to.exist
    cy.wrap(target).click({ force: true })
  })
  cy.wait(800)
  cy.get(`#${styleId}`).click({ force: true })
  flow.closeOpenDropdown()
}

const openToolSidebar = () => {
  cy.contains('span.text-body-md.text-darkest', 'AI Virtual Staging')
    .closest('div.cursor-pointer.items-center.justify-between')
    .should('be.visible')
    .click({ force: true })
}

describe('VS-flow-test-enhanced', () => {
  it('completes full VS flow in a single generation', () => {
    cy.visit('/')
    flow.dismissBlockingModals()

    cy.get(SEL.homeCard).click({ force: true })
    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/vs-test-room.jpg', { force: true })
    flow.waitForUploadComplete()
    flow.dismissBlockingModals()

    cy.log('Testing validation error...')
    flow.clickGenerate()
    flow.verifyValidationError()
    flow.dismissBlockingModals()
    flow.verifySpaceStyleDependency(SEL.spaceStudio, SEL.styleHampton)

    flow.clickGenerate()
    flow.watchCreditApi('creditApi')
    flow.loginAfterGenerateIfNeeded()
    cy.wait('@creditApi', { timeout: 60000 })

    flow.readCreditBalance().then((creditsAfterLogin) => {
      cy.log(`Credit after login: ${creditsAfterLogin}`)

      flow.waitForAllResultsReady({ skipGenerateRetry: true })

      flow.assertCreditAfterAction(
        creditsAfterLogin,
        -1,
        'first generate should deduct 1 credit',
      ).then(() => {
        flow.runResultPageEnhancements({ upscale: true, feedbackMessage: 'Great virtual staging result. Furniture placement looks natural.' })

        cy.contains('span.text-body-md.text-darkest', 'AI Virtual Staging')
          .closest('div.cursor-pointer.items-center.justify-between')
          .click({ force: true })
        selectSpaceById('v5-tool-virtual-staging-space-living-room')
        selectStyleById('v5-tool-virtual-staging-style-hampton')

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
