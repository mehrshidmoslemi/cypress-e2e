/**
 * Import from Listing — Leave / Stay confirmation modal
 */

const {
  createImportListingHelpers,
  LISTING_URLS,
} = require('../support/import-listing-shared')

const LEAVE_STAY_ACCOUNT = {
  email: 'memoslemi.sdstudio+1009@gmail.com',
  password: 'mmmmmmmm',
}

const importFlow = createImportListingHelpers('import-listing-leave-stay', {
  account: LEAVE_STAY_ACCOUNT,
})

describe('Import from Listing — Leave / Stay modal', () => {
  beforeEach(() => {
    importFlow.ensureLoggedIn()
  })

  it('Leave closes import and does not create a project', () => {
    importFlow.startListingImport({
      entry: 'uploader',
      provider: 'zillow',
      url: LISTING_URLS.zillow,
      loggedIn: true,
      stopBeforeConfirm: true,
    })

    importFlow.tryOpenLeaveStayModal()
    importFlow.assertLeaveStayVisible()
    cy.contains('button', /leave import/i).click({ force: true })

    cy.contains('Check Details').should('not.exist')
    cy.get('@createProject.all').then((calls) => {
      expect(calls?.length || 0, 'project should not be created after Leave').to.equal(0)
    })
  })

  it('Stay keeps import running', () => {
    importFlow.startListingImport({
      entry: 'uploader',
      provider: 'zillow',
      url: LISTING_URLS.zillow,
      loggedIn: true,
      stopBeforeConfirm: true,
    })

    cy.contains('button', /it's correct,\s*continue/i).click({ force: true })
    importFlow.tryOpenLeaveStayModalDuringImport()
    importFlow.assertLeaveStayVisible()
    cy.contains('button', /^Stay$/i).click({ force: true })

    importFlow.assertImportContinuesAfterStay()
    importFlow.waitForImportedImagesReady()
  })
})
