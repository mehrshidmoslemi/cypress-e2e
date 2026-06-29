/**
 * Import from Listing E2E
 *
 * Imports listing photos from Zillow or Realtor into a Studio project.
 *
 * Entry points
 * - Uploader: Home → Virtual Staging → Import from Zillow/Realtor (or Paste URL)
 * - Create Project: /studio/projects → Create Project modal → listing URL
 *
 * Auth: logged in (session ready) or logged out (login when Check Details / Create Project prompts)
 *
 * Test groups (16)
 * 1. Invalid URL (6) — bad Zillow/Realtor/malformed URLs via uploader & Create Project; no project created
 * 2. Leave / Stay (2) — Escape on Check Details; Leave cancels import, Stay continues
 * 3. Uploader happy path (4) — Zillow/Realtor × logged in/out; Do Magic; Zillow → Maybe later, Realtor → View Results
 * 4. Create Project happy path (4) — same flow via Create Project modal (logged in/out)
 *
 * Happy-path checks: Check Details → import complete → Do Magic → results modal → input/result counts ≥ 1 in Studio
 */
const { createImportListingHelpers, LISTING_URLS, INVALID_URLS } = require('../support/import-listing-shared')

const IMPORT_LISTING_ACCOUNT = {
  email: 'memoslemi.sdstudio+1080@gmail.com',
  password: '12345678',
}

const importFlow = createImportListingHelpers('import-listing', { account: IMPORT_LISTING_ACCOUNT })

describe('Import from Listing', () => {
  describe('Invalid URL', () => {
    ;['uploader', 'create-project'].forEach((entry) => {
      ;['zillow', 'realtor'].forEach((provider) => {
        it(`rejects invalid ${provider} URL via ${entry.replace('-', ' ')}`, () => {
          importFlow.ensureLoggedIn()
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
        importFlow.ensureLoggedIn()
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

  describe('Leave / Stay modal', () => {
    it('Leave closes import and does not create a project', () => {
      importFlow.ensureLoggedIn()
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
      importFlow.ensureLoggedIn()
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

  describe('Uploader flow', () => {
    describe('Logged in', () => {
      it('imports Zillow listing, runs Do Magic, dismisses results modal with Maybe later', () => {
        importFlow.runFullImportFlow({
          entry: 'uploader',
          provider: 'zillow',
          url: LISTING_URLS.zillow,
          loggedIn: true,
        })
      })

      it('imports Realtor listing, runs Do Magic, opens Results via See Results', () => {
        importFlow.runFullImportFlow({
          entry: 'uploader',
          provider: 'realtor',
          url: LISTING_URLS.realtor,
          loggedIn: true,
        })
      })
    })

    describe('Logged out', () => {
      it('imports Zillow listing after guest login', () => {
        importFlow.runFullImportFlow({
          entry: 'uploader',
          provider: 'zillow',
          url: LISTING_URLS.zillow,
          loggedIn: false,
        })
      })

      it('imports Realtor listing after guest login', () => {
        importFlow.runFullImportFlow({
          entry: 'uploader',
          provider: 'realtor',
          url: LISTING_URLS.realtor,
          loggedIn: false,
        })
      })
    })
  })

  describe('Create Project flow', () => {
    describe('Logged in', () => {
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

    describe('Logged out', () => {
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
  })
})
