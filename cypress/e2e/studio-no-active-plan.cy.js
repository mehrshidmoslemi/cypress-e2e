/**
 * Studio — no active plan blocks regeneration
 *
 * Account: memoslemi.sdstudio+52@gmail.com / mmmmmmmm
 *
 * Flow (reference recording: 2026-06-29_17-02-28.mp4):
 *   Login → Studio → open previous result → regenerate
 *   → "No Active Plan!" modal → See Plans → /pricing
 */

const { createStudioNoActivePlanHelpers } = require('../support/studio-no-active-plan-shared')

const noPlan = createStudioNoActivePlanHelpers('studio-no-active-plan')

describe('Studio — no active plan blocks regeneration', { testIsolation: false }, () => {
  before(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

  // Step 1 — authenticate with the expired/no-plan account
  it('logs in with memoslemi.sdstudio+52@gmail.com', () => {
    noPlan.ensureLoggedIn()
  })

  // Step 2 — open Studio and a previous result page
  it('navigates to Studio and opens a previous result', () => {
    noPlan.openPreviousResult()
    cy.url().should('match', /order_id=|\/generate|\/results/)
  })

  // Step 3 & 4 — retry generation and verify the No Active Plan modal
  it('blocks regeneration and shows the No Active Plan modal', () => {
    noPlan.attemptRegenerate()
    noPlan.assertNoActivePlanModalVisible()
  })

  // Step 5 — See Plans redirects to the Pricing page
  it('redirects to /pricing when clicking See Plans in the modal', () => {
    noPlan.assertNoActivePlanModalVisible()
    noPlan.clickSeePlansAndAssertPricing()
  })
})
