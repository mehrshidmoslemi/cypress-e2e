/**
 * Studio — nocredit account generate limits
 *
 * Account: memoslemi.sdstudio+nocredit@gmail.com / 12345678
 * Fixture: cypress/fixtures/images/vs-test-room.jpg
 *
 * Flow (reference recording: 2026-06-29_16-31-16.mp4):
 *   Studio → existing photo → generate succeeds
 *   Upload new photo → generate → "Ready for More Inputs?" modal
 *   Get More Photos → coin-buy modal | Upgrade → /pricing
 */

const { createStudioNocreditHelpers } = require('../support/studio-nocredit-shared')

const nocredit = createStudioNocreditHelpers('studio-nocredit-generate')

describe('Studio — nocredit generate limits', { testIsolation: false }, () => {
  before(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

  it('logs in to the nocredit account', () => {
    nocredit.ensureLoggedIn()
  })

  it('generates on an existing Studio photo successfully', () => {
    nocredit.openExistingPhotoWithResults()
    nocredit.generateOnExistingPhoto()
  })

  it('shows the Ready for More Inputs modal when generating on a newly uploaded photo', () => {
    nocredit.uploadNewPhoto()
    nocredit.attemptGenerateOnNewPhoto()
    nocredit.assertMoreInputsModalVisible()
  })

  it('opens the coin-buy modal when clicking Get More Photos', () => {
    nocredit.assertMoreInputsModalVisible()
    nocredit.clickGetMorePhotosAndAssertCoinBuyModal()
    nocredit.closeTopModal()
  })

  it('redirects to /pricing when clicking Upgrade in the limit modal', () => {
    nocredit.ensureResultSidebarVisible()
    nocredit.attemptGenerateOnNewPhoto()
    nocredit.assertMoreInputsModalVisible()
    nocredit.clickUpgradeAndAssertPricing()
  })
})
