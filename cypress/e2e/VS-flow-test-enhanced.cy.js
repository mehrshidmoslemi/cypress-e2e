/**
 * VS-flow-test (Enhanced)
 *
 * Flow: Login → Upload → Validation → 4 generations
 *   Gen-1  Staging — Prime (Studio)
 *   Gen-2  Staging — Non-Prime (Living Room + Hampton)
 *   Gen-3  Restaging + Remove Furniture — Non-Prime (Living Room + Hampton)
 *   Gen-4  Restaging + Remove Furniture — Prime (Living+Dining+Bedroom)
 *
 * Credit: −1 on first generate only; gens 2–4 are free regenerates.
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  homeCard: '#v5-home-tool-virtual-staging-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-virtual-staging-generate-button',
  restageGenerateBtn: '#v5-tool-virtual-restaging-generate-button',
  removeFurnitureToggle: '#v5-service-ai-virtual-staging-ir-toggle',
  spaceStudio: '#v5-tool-virtual-staging-space-studio',
  spaceLivingRoom: '#v5-tool-virtual-staging-space-living-room',
  styleHampton: '#v5-tool-virtual-staging-style-hampton',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'vs-flow-user-10000',
  styleDropdownLabels: ['Prime', 'Modern', 'Hampton', 'Contemporary', 'Scandinavian'],
})

const openStagingSidebar = () => {
  cy.contains('span.text-body-md.text-darkest', 'AI Virtual Staging')
    .closest('div.cursor-pointer.items-center.justify-between')
    .should('be.visible')
    .click({ force: true })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

const openRestagingSidebar = () => {
  openStagingSidebar()
  cy.get('body').then(($body) => {
    if ($body.find(SEL.restageGenerateBtn).length === 0) {
      cy.get(SEL.removeFurnitureToggle).click({ force: true })
    }
  })
  cy.get(`${SEL.restageGenerateBtn}, ${SEL.generateBtn}`, { timeout: 90000 }).should('be.visible')
}

const clickRestageOrGenerate = () => {
  cy.get('body').then(($body) => {
    if ($body.find(SEL.restageGenerateBtn).length) {
      flow.clickGenerate(SEL.restageGenerateBtn)
    } else {
      flow.clickGenerate(SEL.generateBtn)
    }
  })
}

const runRegenerateNoCredit = (setupAndGenerate, message) => {
  return flow.readCreditBalance().then((beforeCredits) => {
    cy.log(`Credit before regenerate: ${beforeCredits}`)
    setupAndGenerate()
    flow.waitForAllResultsReady({ isRegenerate: true })
    return flow.assertCreditAfterAction(beforeCredits, 0, message)
  })
}

describe('VS-flow-test-enhanced', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

  it('completes full VS flow with 4 generations', () => {
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
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/vs-test-room.jpg', { force: true })
      flow.waitForUploadComplete()
      flow.dismissBlockingModals()

      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceStyleDependency(SEL.spaceLivingRoom, SEL.styleHampton)
      flow.dismissBlockingModals()

      // ── Gen-1: Staging — Prime (Studio) ───────────────────────────────────────
      flow.selectSpace(SEL.spaceStudio)

      flow.readCreditBalance().then((beforeGen1Credits) => {
        cy.log(`Credit before Gen-1: ${beforeGen1Credits}`)

        flow.clickGenerate()
        flow.waitForAllResultsReady()

        flow.assertCreditAfterAction(
          beforeGen1Credits,
          -1,
          'first generate should deduct 1 credit',
        ).then(() => {
          flow.runLoginFirstPostGen1({
            upscale: true,
            feedbackMessage: 'Great virtual staging result. Furniture placement looks natural.',
          })

          // ── Gen-2: Staging — Non-Prime (Living Room + Hampton) ────────────────
          runRegenerateNoCredit(() => {
            openStagingSidebar()
            flow.selectSpace(SEL.spaceLivingRoom)
            flow.selectStyle(SEL.styleHampton)
            flow.clickGenerate()
          }, 'Gen-2 staging (non-prime) should NOT deduct credits').then(() => {
            // ── Gen-3: Restaging + Remove Furniture — Non-Prime ──────────────────
            runRegenerateNoCredit(() => {
              openStagingSidebar()
              flow.selectSpace(SEL.spaceLivingRoom)
              flow.selectStyle(SEL.styleHampton)
              cy.get(SEL.removeFurnitureToggle).click({ force: true })
              clickRestageOrGenerate()
            }, 'Gen-3 restaging non-prime should NOT deduct credits').then(() => {
              // ── Gen-4: Restaging + Remove Furniture — Prime (Studio) ────────────
              runRegenerateNoCredit(() => {
                openRestagingSidebar()
                flow.selectSpace(SEL.spaceStudio)
                clickRestageOrGenerate()
              }, 'Gen-4 restaging prime should NOT deduct credits').then(() => {
                flow.manageBookmarks()
              })
            })
          })
        })
      })
    })
  })
})
