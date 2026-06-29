/**
 * Import from Listing — uploader happy path (logged out → guest login)
 */

const {
  createImportListingHelpers,
  LISTING_URLS,
  IMPORT_LISTING_ACCOUNT,
} = require('../support/import-listing-shared')

const importFlow = createImportListingHelpers('import-listing-uploader-out', {
  account: IMPORT_LISTING_ACCOUNT,
})

describe('Import from Listing — Uploader (logged out)', { testIsolation: true }, () => {
  beforeEach(() => {
    importFlow.ensureLoggedOut()
  })

  it('imports Zillow listing after guest login', () => {
    importFlow.runFullImportFlow({
      entry: 'uploader',
      provider: 'zillow',
      url: LISTING_URLS.zillow,
      loggedIn: false,
    })
  })

})
