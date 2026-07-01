/**
 * Import from Listing — Create Project happy path (logged out → guest login)
 */

const {
  createImportListingHelpers,
  LISTING_URLS,
} = require('../support/import-listing-shared')

const CREATE_PROJECT_LOGGED_OUT_ACCOUNT = {
  email: 'memoslemi.sdstudio+free@gmail.com',
  password: '12345678',
}

const importFlow = createImportListingHelpers('import-listing-create-out', {
  account: CREATE_PROJECT_LOGGED_OUT_ACCOUNT,
})

describe('Import from Listing — Create Project (logged out)', { testIsolation: true }, () => {
  beforeEach(() => {
    importFlow.ensureLoggedOut()
  })

  it('imports Zillow listing from Create Project after login', () => {
    importFlow.runFullImportFlow({
      entry: 'create-project',
      provider: 'zillow',
      url: LISTING_URLS.zillow,
      loggedIn: false,
    })
  })

  it('imports Realtor listing from Create Project after login', () => {
    importFlow.runFullImportFlow({
      entry: 'create-project',
      provider: 'realtor',
      url: LISTING_URLS.realtor,
      loggedIn: false,
    })
  })
})
