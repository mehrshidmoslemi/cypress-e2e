/**
 * Import from Listing — invalid URL validation (fast, no full import)
 */

const {
  createImportListingHelpers,
  INVALID_URLS,
  IMPORT_LISTING_ACCOUNT,
} = require('../support/import-listing-shared')

const importFlow = createImportListingHelpers('import-listing-invalid', {
  account: IMPORT_LISTING_ACCOUNT,
})

describe('Import from Listing — Invalid URL', () => {
  beforeEach(() => {
    importFlow.ensureLoggedIn()
  })

  ;['uploader', 'create-project'].forEach((entry) => {
    ;['zillow', 'realtor'].forEach((provider) => {
      it(`rejects invalid ${provider} URL via ${entry.replace('-', ' ')}`, () => {
        importFlow.startListingImport({
          entry: entry === 'create-project' ? 'create-project' : 'uploader',
          provider,
          url: INVALID_URLS[provider],
          loggedIn: true,
          expectSuccess: false,
        })
        importFlow.assertInvalidUrlError()
      })
    })

    it(`rejects malformed URL via ${entry.replace('-', ' ')}`, () => {
      importFlow.startListingImport({
        entry: entry === 'create-project' ? 'create-project' : 'uploader',
        provider: 'zillow',
        url: INVALID_URLS.malformed,
        loggedIn: true,
        expectSuccess: false,
      })
      importFlow.assertInvalidUrlError()
    })
  })
})
