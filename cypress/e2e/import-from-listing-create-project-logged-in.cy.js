/**
 * Import from Listing — Create Project happy path (logged in)
 */

const {
  createImportListingHelpers,
  LISTING_URLS,
  IMPORT_LISTING_ACCOUNT,
} = require('../support/import-listing-shared')

const importFlow = createImportListingHelpers('import-listing-create-in', {
  account: IMPORT_LISTING_ACCOUNT,
})

describe('Import from Listing — Create Project (logged in)', { testIsolation: true }, () => {
  beforeEach(() => {
    importFlow.ensureLoggedIn()
  })

  it('imports Zillow listing from Create Project modal', () => {
    importFlow.runFullImportFlow({
      entry: 'create-project',
      provider: 'zillow',
      url: LISTING_URLS.zillow,
      loggedIn: true,
    })
  })

  it('imports Realtor listing from Create Project modal and navigates to Results', () => {
    importFlow.runFullImportFlow({
      entry: 'create-project',
      provider: 'realtor',
      url: LISTING_URLS.realtor,
      loggedIn: true,
    })
  })
})
