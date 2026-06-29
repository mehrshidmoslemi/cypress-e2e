/**
 * Import from Listing — uploader happy path (logged in)
 */

const {
  createImportListingHelpers,
  LISTING_URLS,
  IMPORT_LISTING_ACCOUNT,
} = require('../support/import-listing-shared')

const importFlow = createImportListingHelpers('import-listing-uploader-in', {
  account: IMPORT_LISTING_ACCOUNT,
})

describe('Import from Listing — Uploader (logged in)', { testIsolation: true }, () => {
  beforeEach(() => {
    importFlow.ensureLoggedIn()
  })

  it('imports Zillow listing, runs Do Magic, dismisses results modal with Maybe later', () => {
    importFlow.runFullImportFlow({
      entry: 'uploader',
      provider: 'zillow',
      url: LISTING_URLS.zillow,
      loggedIn: true,
    })
  })
  })
