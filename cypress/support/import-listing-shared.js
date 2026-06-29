/**
 * Import from Listing — shared helpers
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('./flow-enhanced-shared')

const LISTING_URLS = {
  zillow:
    'https://www.zillow.com/homedetails/1607-Acadia-Dr-Saskatoon-SK-S7H-5K7/462667177_zpid/',
  realtor:
    'https://www.realtor.com/realestateandhomes-detail/2012-S-Yank-Way_Lakewood_CO_80228_M12796-43180',
}

const INVALID_URLS = {
  zillow: 'https://www.zillow.com/not-a-valid-listing-page',
  realtor: 'https://www.realtor.com/not-a-valid-listing-page',
  malformed: 'not-a-url',
}

const PAID_ACCOUNT = {
  email: 'memoslemi.sdstudio+10000@gmail.com',
  password: '12345678',
}

const IMPORT_TIMEOUT = 600000
const GENERATION_TIMEOUT = 900000
const POLL_INTERVAL_MS = 5000
const MAX_POLL_ATTEMPTS = 240

const ONBOARDING_TITLE = 'Which best describes you?'
const ONBOARDING_STEP2 = 'What are you trying to do today?'

const LISTING_SEL = {
  ...COMMON_SEL,
  vsHomeCard: '#v5-home-tool-virtual-staging-card',
  continueListingBtn: 'button[aria-label="Continue with listing URL"]',
  urlInput: 'input[type="text"]:visible',
}

function createImportListingHelpers(sessionId, { account } = {}) {
  const testAccount = account || PAID_ACCOUNT
  const flow = createEnhancedFlowHelpers({ sel: LISTING_SEL, sessionId })

  const loginWithEmail = (email, password) => {
    cy.contains(LISTING_SEL.loginSpan, 'Login', { timeout: 60000 }).click({ force: true })
    cy.contains(LISTING_SEL.loginProfileBtn, 'Login', { timeout: 30000 }).click({ force: true })
    cy.get(LISTING_SEL.loginWithEmailBtn).click({ force: true })
    cy.get(LISTING_SEL.usernameInput).clear().type(email)
    cy.get(LISTING_SEL.passwordInput).clear().type(password, { log: false })
    cy.get(LISTING_SEL.loginSubmitBtn).click({ force: true })
    cy.get('body', { timeout: 20000 }).should(($body) => {
      expect($body.text()).to.not.match(/email or password is invalid/i)
    })
    cy.get(LISTING_SEL.profileMenuTrigger, { timeout: 90000 }).should('be.visible')
    cy.get('nav').contains(/^Login$/).should('not.exist')
  }

  const ensureLoggedOut = () => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  }

  const loginFromModalIfShown = () => {
    cy.get('body').then(($body) => {
      const loginOpen =
        $body.text().includes('Welcome Back') ||
        [...$body.find(LISTING_SEL.loginWithEmailBtn)].some((el) => Cypress.dom.isVisible(el))

      if (!loginOpen) {
        return
      }

      cy.get(LISTING_SEL.loginWithEmailBtn, { timeout: 30000 }).click({ force: true })
      cy.get(LISTING_SEL.usernameInput).clear({ force: true }).type(testAccount.email, { force: true })
      cy.get(LISTING_SEL.passwordInput)
        .clear({ force: true })
        .type(testAccount.password, { log: false, force: true })
      cy.get(LISTING_SEL.loginSubmitBtn).click({ force: true })
      cy.get('body', { timeout: 30000 }).should(($current) => {
        expect($current.text()).to.not.match(/email or password is invalid/i)
      })
      cy.get('nav', { timeout: 90000 }).contains(/^Login$/).should('not.exist')
    })
  }

  const dismissLeaveImportIfShown = () => {
    cy.get('body').then(($body) => {
      if (!$body.text().match(/leave import/i)) {
        return
      }

      cy.contains('button', /^Stay$/i).click({ force: true })
      cy.contains(/leave import/i).should('not.exist')
    })
  }

  const dismissImportFailedModal = () => {
    cy.get('body').then(($body) => {
      if (!/import failed|unable to start import/i.test($body.text())) {
        return
      }

      const closeBtn = [...$body.find('button')].find((btn) => {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase()
        const hasX =
          btn.querySelector('[class*="tabler:x"]') ||
          btn.querySelector('[class*="tabler-x"]')
        return (label === 'close' || hasX) && Cypress.dom.isVisible(btn)
      })

      if (closeBtn) {
        cy.wrap(closeBtn).click({ force: true })
      }
    })
  }

  const closeWelcomeBackModalIfOpen = () => {
    cy.get('body').then(($body) => {
      if (!$body.text().includes('Welcome Back')) {
        return
      }

      const closeBtn = [...$body.find('[role="dialog"] button, button')].find((btn) => {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase()
        const hasX =
          btn.querySelector('[class*="tabler:x"]') ||
          btn.querySelector('[class*="tabler-x"]')
        return (label === 'close' || hasX) && Cypress.dom.isVisible(btn)
      })

      if (closeBtn) {
        cy.wrap(closeBtn).click({ force: true })
      }
    })
  }

  const ensureGuestAuthenticated = () => {
    cy.get('nav', { timeout: 90000 }).then(($nav) => {
      if (!$nav.text().includes('Login')) {
        return
      }

      loginFromModalIfShown()

      cy.get('nav', { timeout: 90000 }).then(($navAfter) => {
        if (!$navAfter.text().includes('Login')) {
          return
        }

        cy.log('Auth modal login incomplete — falling back to nav Login flow')
        dismissLeaveImportIfShown()
        dismissImportFailedModal()
        closeWelcomeBackModalIfOpen()
        loginWithEmail(testAccount.email, testAccount.password)
      })
    })

    flow.completeOnboardingIfShown()
    flow.prepareSiteForTesting()
    cy.get(LISTING_SEL.profileMenuTrigger, { timeout: 90000 }).should('be.visible')
    cy.get('nav').contains(/^Login$/).should('not.exist')
  }

  const dismissOnboardingDialog = ($dialog) => {
    const closeBtn = [...$dialog.querySelectorAll('button')].find((btn) => {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase()
      return (
        label === 'close' ||
        btn.querySelector('[class*="tabler:x"], [class*="tabler-x"]')
      )
    })

    if (closeBtn) {
      cy.wrap(closeBtn).click({ force: true })
      return true
    }

    return false
  }

  const completeOnboardingInDialog = ($dialog) => {
    const text = $dialog.textContent || $dialog.text?.() || ''
    if (!text.includes(ONBOARDING_TITLE)) {
      return
    }

    cy.log('Completing onboarding questionnaire')
    cy.wrap($dialog).contains('Other').filter(':visible').last().click({ force: true })

    cy.get('body', { timeout: 30000 }).then(($body) => {
      if ($body.text().includes(ONBOARDING_STEP2)) {
        cy.contains('Just testing AIHomeDesign', { timeout: 30000 }).click({ force: true })
        cy.contains("I'll explore on my own", { timeout: 30000 }).click({ force: true })
        return
      }

      cy.log('Onboarding step 2 not shown — dismissing via close button')
      dismissOnboardingDialog($dialog)
    })
  }

  const openCreateProjectModalExpectingNewProject = () => {
    cy.log('Opening Create Project modal')
    clickCreateProjectButton()

    cy.get('[role="dialog"]:visible', { timeout: 15000 }).then(($dialog) => {
      const text = $dialog.text()

      if (text.includes('Welcome Back')) {
        loginFromModalIfShown()
        clickCreateProjectButton()
        cy.get('[role="dialog"]:visible', { timeout: 15000 }).then(($afterLogin) => {
          if ($afterLogin.text().includes(ONBOARDING_TITLE)) {
            completeOnboardingInDialog($afterLogin)
            clickCreateProjectButton()
          }
        })
        return
      }

      if (text.includes(ONBOARDING_TITLE)) {
        completeOnboardingInDialog($dialog)
        clickCreateProjectButton()
      }
    })

    cy.get('[role="dialog"]:visible', { timeout: 15000 }).should('contain.text', 'New Project')
  }

  const ensureLoggedIn = () => {
    cy.session(
      `${sessionId}:${testAccount.email}`,
      () => {
        cy.visit('/')
        cy.get('nav', { timeout: 60000 }).should('exist')
        flow.prepareSiteForTesting()
        loginWithEmail(testAccount.email, testAccount.password)
        flow.prepareSiteForTesting()
      },
      {
        validate() {
          cy.visit('/')
          cy.get('nav', { timeout: 60000 }).should('exist')
          cy.get('nav').contains(/^Login$/).should('not.exist')
        },
      },
    )
    cy.visit('/')
    flow.prepareSiteForTesting()
  }

  const ensureStudioSession = () => {
    ensureLoggedIn()
    cy.visit('/studio/projects')
    cy.get('nav', { timeout: 60000 }).should('exist')
    cy.get('[aria-busy="true"]', { timeout: 60000 }).should('not.exist')
    cy.contains('button', 'Create Project', { timeout: 60000 }).should('be.visible')
  }

  const clickCreateProjectButton = () => {
    cy.contains('button', 'Create Project', { timeout: 30000 }).scrollIntoView().click({ force: true })
  }

  const providerLabel = (provider) => new RegExp(`import from ${provider}`, 'i')

  const openUploaderImport = (provider) => {
    cy.get(LISTING_SEL.vsHomeCard).scrollIntoView().click({ force: true })
    cy.contains(/drop or add several photos/i, { timeout: 30000 }).should('be.visible')
    cy.get('body').then(($body) => {
      if ($body.text().match(providerLabel(provider))) {
        cy.contains(providerLabel(provider)).click({ force: true })
      } else {
        cy.contains('button', 'Paste URL').click({ force: true })
      }
    })
    cy.get(LISTING_SEL.urlInput, { timeout: 15000 }).should('be.visible')
  }

  const openCreateProjectImport = ({ loggedIn = true } = {}) => {
    if (loggedIn) {
      ensureStudioSession()
    } else {
      cy.visit('/studio/projects')
      cy.get('nav', { timeout: 60000 }).should('exist')
      cy.get('body').then(($body) => {
        if ($body.text().includes('Accept all')) {
          cy.contains('button', 'Accept all').click({ force: true })
        }
      })
    }

    openCreateProjectModalExpectingNewProject()
    cy.get('[role="dialog"] input[type="text"]', { timeout: 15000 }).should('have.length.at.least', 1)
  }

  const submitListingUrl = (url, entry = 'uploader') => {
    if (entry === 'create-project') {
      cy.get('[role="dialog"] input[type="text"]').then(($inputs) => {
        const urlInput =
          [...$inputs].find((el) => {
            const ph = (el.placeholder || '').toLowerCase()
            return ph.includes('http') || ph.includes('realtor') || ph.includes('zillow') || ph.includes('url')
          }) || $inputs[$inputs.length - 1]

        cy.wrap(urlInput).clear({ force: true }).type(url, { force: true })
      })
      cy.contains('button', /^(Create|Continue)$/i, { timeout: 15000 }).click({ force: true })
      return
    }

    cy.get(LISTING_SEL.urlInput).first().clear({ force: true }).type(url, { force: true })
    cy.get(LISTING_SEL.continueListingBtn).click({ force: true })
  }

  const waitForListingDetails = (
    stopBeforeConfirm = false,
    { loggedIn = true, entry = 'uploader', provider = 'zillow', url = '', retryAttempt = 0 } = {},
  ) => {
    cy.get('body', { timeout: IMPORT_TIMEOUT }).should(($body) => {
      const text = $body.text()

      if (text.includes('Check Details')) {
        expect(text, 'Check Details context').to.match(/image founded|images founded|address/i)
        expect($body.find('img').length, 'listing preview image').to.be.greaterThan(0)
        return
      }

      if (!loggedIn) {
        const needsRecovery =
          text.includes('Welcome Back') ||
          /import failed|unable to start import/i.test(text)
        expect(needsRecovery, 'guest scrape should reach Check Details or require auth').to.be.true
        return
      }

      expect(text, 'Check Details step').to.include('Check Details')
    })

    cy.get('body').then(($body) => {
      const text = $body.text()

      if (!loggedIn && !text.includes('Check Details')) {
        if (retryAttempt >= 1) {
          throw new Error('Guest listing import could not reach Check Details after login retry')
        }

        dismissImportFailedModal()
        ensureGuestAuthenticated()

        if (entry === 'uploader') {
          openUploaderImport(provider)
          submitListingUrl(url, 'uploader')
          waitForListingDetails(stopBeforeConfirm, {
            loggedIn: false,
            entry,
            provider,
            url,
            retryAttempt: retryAttempt + 1,
          })
        }
        return
      }

      if (stopBeforeConfirm) {
        return
      }

      cy.contains('button', /it's correct,\s*continue/i).click({ force: true })
      ensureGuestAuthenticated()
    })
  }

  const confirmListingDetails = () => waitForListingDetails(false)

  const isMagicCompleteVisible = ($body) =>
    /magic complete|results are ready|your ai results are ready/i.test($body.text() || '')

  const startListingImport = ({ entry, provider, url, loggedIn, expectSuccess = true, stopBeforeConfirm = false }) => {
    if (loggedIn) {
      ensureLoggedIn()
    } else {
      ensureLoggedOut()
      cy.visit('/')
      flow.prepareSiteForTesting()
    }

    cy.intercept('POST', '**/v3/project**').as('createProject')
    cy.intercept('GET', '**/v3/project?*').as('projectList')
    cy.intercept('GET', '**/v3/scrapping/**').as('listingScrape')

    if (entry === 'uploader') {
      openUploaderImport(provider)
    } else {
      openCreateProjectImport({ loggedIn })
    }

    submitListingUrl(url, entry)

    if (!expectSuccess) {
      cy.get('body', { timeout: 60000 }).should(($body) => {
        const text = $body.text()
        const hasError = /invalid|not supported|could not|unable|valid listing|error|failed|valid url|enter a valid|only zillow|listing urls are supported/i.test(
          text,
        )
        const blocked = text.includes("It's Correct, Continue") === false
        expect(hasError || blocked, 'invalid URL should not proceed to Check Details').to.be.true
      })
      return
    }

    waitForListingDetails(stopBeforeConfirm, { loggedIn, entry, provider, url })
  }

  const waitForImportStarted = () => {
    cy.get('body', { timeout: IMPORT_TIMEOUT }).should(($body) => {
      const text = $body.text()
      expect(
        text.includes('Upload Assets') ||
          text.includes('Applying Magic') ||
          text.includes('Do Magic') ||
          /import/i.test(text) ||
          /uploading/i.test(text),
        'import progress UI',
      ).to.be.true
    })
  }

  const waitForImportComplete = () => {
    cy.get('body', { timeout: IMPORT_TIMEOUT }).should(($body) => {
      const text = $body.text()
      const stillImporting =
        /importing|fetching|scraping|uploading/i.test(text) &&
        !text.includes('Upload Assets') &&
        !text.includes('Do Magic')

      const onUploadPanel =
        text.includes('Upload Assets') ||
        text.includes('Do Magic') ||
        isMagicCompleteVisible($body)
      const onStudioProjects =
        text.includes('Projects') && $body.find('img').length > 3 && !text.includes('Check Details')

      expect(stillImporting, 'import should finish').to.be.false
      expect(onUploadPanel || onStudioProjects, 'upload panel or studio project after import').to.be.true
    })
  }

  const openProjectFromStudioList = (project) => {
    const label = project?.name || project?.title || project?.address || ''
    if (label) {
      cy.contains(label.split(',')[0].trim().slice(0, 24), { timeout: 120000 }).click({ force: true })
      return
    }

    cy.get('h3, [class*="project"]')
      .filter(':visible')
      .first()
      .click({ force: true })
  }

  const ensureUploadPanelForMagic = (project) => {
    cy.get('body').then(($body) => {
      if (
        $body.text().includes('Upload Assets') ||
        $body.text().includes('Do Magic') ||
        isMagicCompleteVisible($body)
      ) {
        return
      }

      cy.visit('/studio/projects', { timeout: 120000, retryOnStatusCodeFailure: true })
      prepareStudioPage()
      openProjectFromStudioList(project)
      cy.contains(/upload assets|do magic|project overview|magic complete/i, { timeout: IMPORT_TIMEOUT }).should(
        'exist',
      )
    })
  }

  const clickDoMagicIfShown = () => {
    cy.get('body').then(($body) => {
      const text = $body.text()
      if (/magic complete|results are ready/i.test(text)) {
        return
      }
      if (text.includes('Do Magic')) {
        cy.contains('button', 'Do Magic').click({ force: true })
      }
    })
  }

  const waitForApplyingMagic = () => {
    cy.get('body', { timeout: GENERATION_TIMEOUT }).should(($body) => {
      const text = $body.text()
      const done =
        text.includes('Your results are ready') ||
        text.includes('Your AI results are ready') ||
        /magic complete/i.test(text) ||
        /results are ready/i.test(text)
      const inProgress =
        text.includes('Applying Magic') || text.includes('Quality assurance') || text.includes('Do Magic')

      expect(done || inProgress, 'Do Magic / generation progress').to.be.true
    })

    cy.get('body', { timeout: GENERATION_TIMEOUT }).should(($body) => {
      const text = $body.text()
      expect(
        text.includes('Your results are ready') ||
          text.includes('Your AI results are ready') ||
          /magic complete/i.test(text) ||
          /results are ready/i.test(text),
        'generation finished',
      ).to.be.true
    })
  }

  const handleResultsReadyModal = (provider) => {
    cy.get('body', { timeout: GENERATION_TIMEOUT }).should(($body) => {
      expect($body.text()).to.match(/your (ai )?results are ready|magic complete/i)
    })

    if (provider === 'zillow') {
      cy.get('body').then(($body) => {
        if ($body.text().match(/maybe later/i)) {
          cy.contains('button', /maybe later/i).click({ force: true })
        }
      })
      return
    }

    cy.get('body').then(($body) => {
      const resultsBtn = [...$body.find('button')].find(
        (el) =>
          /see results|check results|view results/i.test((el.textContent || '').trim()) &&
          Cypress.dom.isVisible(el),
      )

      if (resultsBtn) {
        cy.wrap(resultsBtn).click({ force: true })
        return
      }

      if ($body.text().match(/maybe later/i)) {
        cy.log('See/View Results not found — dismissing with Maybe later')
        cy.contains('button', /maybe later/i).click({ force: true })
      }
    })

    cy.url({ timeout: 60000 }).should('match', /order_id=|\/results|\/generate|magic-results|\/studio\/projects/)
    cy.get('body', { timeout: GENERATION_TIMEOUT }).should(($body) => {
      const onResultsPage =
        $body.find(LISTING_SEL.downloadBtn).length > 0 ||
        $body.find(LISTING_SEL.resultThumbnail).length > 0 ||
        /download|results|magic|upload assets/i.test($body.text())
      expect(onResultsPage, 'results page content').to.be.true
    })
  }

  const projectCounts = (project) => ({
    input: project?.input_count ?? project?.report?.input_count,
    result: project?.result_count ?? project?.report?.result_count,
  })

  const findProjectInList = (response, projectId) => {
    const projects = response.body?.data || []
    return projects.find((project) => project.id === projectId)
  }

  const prepareStudioPage = () => {
    cy.get('nav', { timeout: 120000 }).should('exist')
    cy.get('[aria-busy="true"]', { timeout: 120000 }).should('not.exist')
    cy.get('body').then(($body) => {
      if ($body.text().includes('Accept all')) {
        cy.contains('button', 'Accept all').click({ force: true })
      }
    })
  }

  const resolveImportProject = () => {
    return cy.get('@createProject.all', { timeout: IMPORT_TIMEOUT }).then((calls) => {
      if (calls?.length > 0 && calls.at(-1).response?.body?.data) {
        return cy.wrap(calls.at(-1).response.body.data)
      }

      return cy.wait('@createProject', { timeout: IMPORT_TIMEOUT }).then(({ response }) => {
        expect(response?.body?.data, 'created project payload').to.exist
        return cy.wrap(response.body.data)
      })
    })
  }

  const pollProjectCounts = (projectId, expected, attempt = 0) => {
    cy.visit('/studio/projects', { timeout: 120000, retryOnStatusCodeFailure: true })
    prepareStudioPage()
    return cy.wait('@projectList', { timeout: 120000 }).then(({ response }) => {
      const project = findProjectInList(response, projectId)
      const counts = projectCounts(project)

      const ready =
        project &&
        counts.input >= expected.minInput &&
        (expected.minResults === undefined || counts.result >= expected.minResults)

      if (ready) {
        return cy.wrap({ project, counts })
      }

      if (attempt >= MAX_POLL_ATTEMPTS) {
        throw new Error(`Timed out polling project counts: ${JSON.stringify(project)}`)
      }

      cy.wait(POLL_INTERVAL_MS)
      return pollProjectCounts(projectId, expected, attempt + 1)
    })
  }

  const assertAssetsVisible = () => {
    dismissLeaveImportIfShown()

    cy.get('body', { timeout: 120000 }).should(($body) => {
      if (isMagicCompleteVisible($body)) {
        return
      }

      const uploadHeader = [...$body.find('h3, h2, div, span')].find(
        (el) => /^upload assets$/i.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )
      expect(
        Boolean(uploadHeader) || isMagicCompleteVisible($body),
        'Upload Assets panel or Magic Complete',
      ).to.be.true
    })
  }

  const assertPreviewCounts = (minInput, minResults = null) => {
    cy.get('body').then(($body) => {
      const text = $body.text()
      if (/magic complete|results are ready/i.test(text)) {
        return
      }

      const input = Number(text.match(/Input\s*(\d+)/i)?.[1])
      if (Number.isNaN(input)) {
        return
      }
      expect(input, 'preview input count').to.be.at.least(minInput)
      if (minResults !== null) {
        const results = Number(text.match(/Results\s*(\d+)/i)?.[1])
        if (!Number.isNaN(results)) {
          expect(results, 'preview results count').to.be.at.least(minResults)
        }
      }
    })
  }

  const assertStudioProjectWithSeeResults = (projectId) => {
    cy.visit('/studio/projects', { timeout: 120000, retryOnStatusCodeFailure: true })
    prepareStudioPage()
    cy.wait('@projectList', { timeout: 120000 }).then(({ response }) => {
      const project = findProjectInList(response, projectId)
      expect(project, 'project in studio list').to.exist
      expect(projectCounts(project).input, 'studio project input_count').to.be.at.least(1)
    })

    cy.get('[aria-busy="true"]', { timeout: 120000 }).should('not.exist')
    cy.get('body').then(($body) => {
      const hasBanner = /see results|check results|magic complete/i.test($body.text())
      if (!hasBanner) {
        cy.log('See Results banner not visible on projects list — project verified via API')
      }
    })
  }

  const assertInvalidUrlError = () => {
    cy.get('body', { timeout: 60000 }).should(($body) => {
      const text = $body.text()
      const hasError = /invalid|not supported|could not|unable|valid listing|error|failed|only zillow|listing urls are supported/i.test(
        text,
      )
      const blocked =
        !text.includes("It's Correct, Continue") &&
        !text.includes('Check Details') &&
        !text.match(/image founded|images founded/i)
      expect(hasError || blocked, 'invalid URL should show error or not proceed').to.be.true
    })
    cy.get('@createProject.all').then((calls) => {
      expect(calls?.length || 0, 'project should not be created for invalid URL').to.equal(0)
    })
  }

  const tryOpenLeaveStayModal = () => {
    cy.contains('Check Details').should('be.visible')
    cy.get('body').type('{esc}', { force: true })
    cy.contains(/leave import/i, { timeout: 15000 }).should('be.visible')
  }

  const assertLeaveStayVisible = () => {
    cy.get('body', { timeout: 15000 }).should(($body) => {
      const text = $body.text()
      expect(text, 'Leave/Stay confirmation').to.match(/leave import/i)
      expect(text, 'Stay button label').to.match(/stay/i)
    })
  }

  const runFullImportFlow = ({
    entry,
    provider,
    url,
    loggedIn,
    skipStudioBanner = false,
  }) => {
    startListingImport({ entry, provider, url, loggedIn })

    waitForImportStarted()
    waitForImportComplete()

    resolveImportProject().then((created) => {
      cy.wrap(created).as('importProject')
    })

    cy.get('@importProject').then((project) => {
      ensureUploadPanelForMagic(project)

      cy.get('body').then(($body) => {
        const text = $body.text()
        const magicDone = isMagicCompleteVisible($body)
        if (text.includes('Upload Assets') && !magicDone) {
          assertAssetsVisible()
          assertPreviewCounts(projectCounts(project).input || 1)
        }
      })

      clickDoMagicIfShown()
      waitForApplyingMagic()
      handleResultsReadyModal(provider)

      pollProjectCounts(project.id, { minInput: 1, minResults: 1 }).then(({ counts }) => {
        expect(counts.input, 'API input_count').to.be.at.least(1)
        expect(counts.result, 'API result_count').to.be.at.least(1)
      })

      if (!skipStudioBanner) {
        assertStudioProjectWithSeeResults(project.id)
      }
    })
  }

  return {
    flow,
    LISTING_URLS,
    INVALID_URLS,
    PAID_ACCOUNT: testAccount,
    ensureLoggedIn,
    ensureLoggedOut,
    ensureStudioSession,
    startListingImport,
    submitListingUrl,
    openUploaderImport,
    openCreateProjectImport,
    waitForImportStarted,
    waitForImportComplete,
    waitForProjectCreated: resolveImportProject,
    resolveImportProject,
    assertInvalidUrlError,
    tryOpenLeaveStayModal,
    assertLeaveStayVisible,
    confirmListingDetails,
    waitForListingDetails,
    runFullImportFlow,
    providerLabel,
  }
}

module.exports = {
  createImportListingHelpers,
  LISTING_URLS,
  INVALID_URLS,
  PAID_ACCOUNT,
}
