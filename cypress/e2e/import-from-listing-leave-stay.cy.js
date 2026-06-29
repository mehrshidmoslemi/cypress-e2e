/**
 * Import from Listing — Leave / Stay confirmation modal
 */

const {
  createImportListingHelpers,
  LISTING_URLS,
  IMPORT_LISTING_ACCOUNT,
} = require('../support/import-listing-shared')

const importFlow = createImportListingHelpers('import-listing-leave-stay', {
  account: IMPORT_LISTING_ACCOUNT,
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

    importFlow.tryOpenLeaveStayModal()
    importFlow.assertLeaveStayVisible()
    cy.contains('button', /^Stay$/i).click({ force: true })

    cy.contains('Check Details').should('be.visible')
    importFlow.confirmListingDetails()
    importFlow.waitForImportStarted()
  })
})
