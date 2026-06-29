/**
 * Studio project full flow
 *
 * Create project → import/upload inside project → Studio sort/load-more/counters → logout gating
 *
 * Fixture: cypress/fixtures/images/vs-test-room.jpg
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  fileInput: 'input[type="file"]',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'studio-project-full-flow',
})

const ACCOUNT = {
  email: 'memoslemi.sdstudio+10000@gmail.com',
  password: '12345678',
}

const ONBOARDING_TITLE = 'Which best describes you?'
const ONBOARDING_STEP2 = 'What are you trying to do today?'
const UPLOAD_IMAGE = 'cypress/fixtures/images/vs-test-room.jpg'
const NAV_TIMEOUT = 60000
const MODAL_TIMEOUT = 30000
const UPLOAD_TIMEOUT = 180000

let createdProjectId = null
let projectName = null

const visibleOnboardingDialog = ($body) =>
  [...$body.find('[role="dialog"]')].find(
    (el) => Cypress.dom.isVisible(el) && (el.textContent || '').includes(ONBOARDING_TITLE),
  )

const completeOnboardingInVisibleDialog = () => {
  cy.get('body').then(($body) => {
    const dialog = visibleOnboardingDialog($body)
    if (!dialog) {
      return
    }

    cy.log('Completing onboarding questionnaire in visible dialog')
    cy.wrap(dialog).contains('Other').click({ force: true })
    cy.contains(ONBOARDING_STEP2, { timeout: MODAL_TIMEOUT }).should('be.visible')
    cy.contains('Just testing AIHomeDesign', { timeout: MODAL_TIMEOUT }).click({ force: true })
    cy.contains("I'll explore on my own", { timeout: MODAL_TIMEOUT }).click({ force: true })
    cy.get('body').should(($current) => {
      expect(visibleOnboardingDialog($current), 'onboarding dialog should close').to.be.undefined
    })
  })
}

const preparePageForTesting = () => {
  cy.get('nav', { timeout: NAV_TIMEOUT }).should('exist')
  cy.get('body').then(($body) => {
    if ($body.text().includes('Accept all')) {
      cy.contains('button', 'Accept all').click({ force: true })
    }
  })
}

const assertLoggedIn = () => {
  cy.get('nav', { timeout: NAV_TIMEOUT }).contains(/^Login$/).should('not.exist')
  cy.get(SEL.profileMenuTrigger, { timeout: NAV_TIMEOUT }).should('be.visible')
}

const freshLogin = () => {
  cy.log('Fresh login — clearing session')
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.clearAllSessionStorage()
  cy.visit('/')
  flow.prepareSiteForTesting()

  cy.contains(SEL.loginSpan, 'Login', { timeout: NAV_TIMEOUT }).click({ force: true })
  cy.contains(SEL.loginProfileBtn, 'Login', { timeout: MODAL_TIMEOUT }).click({ force: true })
  cy.get(SEL.loginWithEmailBtn).click({ force: true })
  cy.get(SEL.usernameInput).clear({ force: true }).type(ACCOUNT.email, { force: true })
  cy.get(SEL.passwordInput).clear({ force: true }).type(ACCOUNT.password, { log: false, force: true })
  cy.get(SEL.loginSubmitBtn).click({ force: true })

  cy.get('body', { timeout: MODAL_TIMEOUT }).should(($body) => {
    expect($body.text(), 'login should not show invalid credentials').to.not.match(
      /email or password is invalid/i,
    )
  })
  assertLoggedIn()
  preparePageForTesting()
}

const ensureStudioSession = () => {
  cy.log('Ensuring authenticated Studio session')
  assertLoggedIn()
  preparePageForTesting()
}

const loginFromModalIfShown = () => {
  cy.get('body').then(($body) => {
    const authOpen =
      $body.text().includes('Welcome Back') ||
      [...$body.find(SEL.loginWithEmailBtn)].some((el) => Cypress.dom.isVisible(el))

    if (!authOpen) {
      return
    }

    cy.log('Auth modal open — logging in inline')
    cy.get(SEL.loginWithEmailBtn).click({ force: true })
    cy.get(SEL.usernameInput).clear({ force: true }).type(ACCOUNT.email, { force: true })
    cy.get(SEL.passwordInput)
      .clear({ force: true })
      .type(ACCOUNT.password, { log: false, force: true })
    cy.get(SEL.loginSubmitBtn).click({ force: true })
    assertLoggedIn()
    preparePageForTesting()
  })
}

const openCreateProjectModal = () => {
  cy.log('Opening Create Project modal')
  ensureStudioSession()

  cy.contains('button', 'Create Project', { timeout: NAV_TIMEOUT }).scrollIntoView().click({ force: true })

  cy.get('body').then(($body) => {
    if (visibleOnboardingDialog($body)) {
      cy.log('Onboarding blocked Create Project — completing and retrying')
      completeOnboardingInVisibleDialog()
      cy.contains('button', 'Create Project').scrollIntoView().click({ force: true })
    } else if ($body.text().includes('Welcome Back')) {
      loginFromModalIfShown()
      cy.contains('button', 'Create Project').scrollIntoView().click({ force: true })
    }
  })

  cy.get('[role="dialog"]:visible', { timeout: MODAL_TIMEOUT }).should('contain.text', 'New Project')
}

const submitCreateProjectModal = () => {
  cy.get('[role="dialog"]:visible').then(($dialog) => {
    const $inputs = $dialog.find('input[type="text"]:visible')
    expect($inputs.length, 'New Project modal should have a text input').to.be.greaterThan(0)
    cy.wrap($inputs.first()).clear({ force: true }).type(projectName, { force: true })
  })

  cy.get('[role="dialog"]:visible').then(($dialog) => {
    const buttons = [...$dialog.find('button')].map((el) => ({
      el,
      text: (el.textContent || '').trim(),
    }))
    const submit =
      buttons.find(({ text }) => /^(Create|Continue)$/i.test(text)) ||
      buttons.find(({ text }) => /create|continue/i.test(text))

    expect(submit, 'Create/Continue button in modal').to.exist
    cy.wrap(submit.el).click({ force: true })
  })
}

const waitForStudioGridLoaded = () => {
  cy.log('Waiting for Studio projects grid to load')
  cy.get('[aria-busy="true"]', { timeout: NAV_TIMEOUT }).should('not.exist')
  cy.contains('button', 'Create Project', { timeout: NAV_TIMEOUT }).should('be.visible')
  cy.get('body').should(($body) => {
    const text = $body.text()
    expect(text, 'Projects counter label').to.match(/\d+\s*Projects/i)
    expect(text, 'Files counter label').to.match(/\d+\s*Files/i)
  })

  cy.get('body').then(($body) => {
    if (!$body.text().includes('Create Your First Project')) {
      cy.get('h2, h3')
        .filter((_i, el) => /^Projects$/i.test(el.textContent.trim()))
        .first()
        .scrollIntoView()
        .should('be.visible')
    }
  })
}

const parseHeaderCounts = (text) => ({
  projects: Number(text.match(/(\d+)\s*Projects/i)?.[1]),
  files: Number(text.match(/(\d+)\s*Files/i)?.[1]),
})

const countVisibleProjectCards = () => {
  return cy.document().then((doc) => {
    const headings = [...doc.querySelectorAll('h3')].filter((el) => {
      const label = (el.textContent || '').trim()
      if (!label || /^(Projects|Single Files)$/i.test(label)) {
        return false
      }
      return Cypress.dom.isVisible(el)
    })
    return headings.length
  })
}

const openSortControlNear = () => {
  cy.log('Opening sort dropdown')

  cy.get('body').type('{esc}', { force: true })

  cy.get('h2, h3')
    .filter((_i, el) => /^Projects$/i.test(el.textContent.trim()))
    .first()
    .scrollIntoView()

  cy.get('body').then(($body) => {
    const sortButton = [...$body.find('button')].find(
      (el) => /Sort by/i.test(el.textContent || '') && Cypress.dom.isVisible(el),
    )

    if (sortButton) {
      cy.wrap(sortButton).click({ force: true })
      return
    }

    const sortSelect = [...$body.find('select')].find((el) => Cypress.dom.isVisible(el))
    if (sortSelect) {
      cy.wrap(sortSelect).click({ force: true })
      return
    }

    cy.contains('button', /Sort by/i, { timeout: MODAL_TIMEOUT }).first().click({ force: true })
  })
}

const selectSortOption = (optionLabel) => {
  cy.log(`Selecting sort option: ${optionLabel}`)

  const aliases =
    optionLabel === 'Latest'
      ? ['Latest', 'Oldest']
      : [optionLabel]

  cy.get('body').then(($body) => {
    let matched = null
    let matchedAlias = null

    for (const alias of aliases) {
      const pattern = new RegExp(`^${alias}$|Sort by:?\\s*${alias}`, 'i')
      matched = [...$body.find('[role="menuitem"], [role="option"], button, li, a, span')].find(
        (el) => pattern.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )
      if (matched) {
        matchedAlias = alias
        break
      }
    }

    if (matched) {
      if (matchedAlias !== optionLabel) {
        cy.log(`Sort label "${optionLabel}" not found — using "${matchedAlias}"`)
      }
      cy.wrap(matched).click({ force: true })
      return
    }

    const selectEl = [...$body.find('select')].find((el) => Cypress.dom.isVisible(el))
    if (selectEl) {
      cy.wrap(selectEl).select(aliases[aliases.length - 1], { force: true })
      return
    }

    const fallbackAlias = aliases[aliases.length - 1]
    const pattern = new RegExp(`^${fallbackAlias}$|Sort by:?\\s*${fallbackAlias}`, 'i')
    cy.contains(pattern, { timeout: MODAL_TIMEOUT }).filter(':visible').first().click({ force: true })
  })

  cy.get('[aria-busy="true"]', { timeout: NAV_TIMEOUT }).should('not.exist')
}

const assertGridHasItems = (context) => {
  countVisibleProjectCards().then((count) => {
    expect(count, `${context} — grid should render items`).to.be.greaterThan(0)
  })
}

const openProjectUploadPanel = () => {
  cy.log('Opening project upload panel')
  completeOnboardingInVisibleDialog()

  cy.get('body').then(($body) => {
    const addFirst = [...$body.find('button, a, p, span, div')].find(
      (el) => /add your first image/i.test(el.textContent || '') && Cypress.dom.isVisible(el),
    )
    if (addFirst) {
      cy.wrap(addFirst).click({ force: true })
    }
  })

  cy.contains('button', /^Import$/i, { timeout: MODAL_TIMEOUT }).click({ force: true })
  cy.wait(500)

  cy.get('body').then(($body) => {
    const panelOpen =
      $body.find(SEL.fileInput).length > 0 || /browse from device/i.test($body.text())
    if (!panelOpen) {
      cy.log('Upload panel not open — clicking Import again')
      cy.contains('button', /^Import$/i).click({ force: true })
    }
  })

  cy.get('body', { timeout: MODAL_TIMEOUT }).should(($body) => {
    const panelOpen =
      $body.find(SEL.fileInput).length > 0 || /browse from device/i.test($body.text())
    expect(panelOpen, 'Import should open upload panel').to.be.true
  })

  cy.get(SEL.fileInput, { timeout: MODAL_TIMEOUT }).should('exist')
}

const logoutViaProfileMenu = () => {
  cy.log('Logging out via profile menu')
  preparePageForTesting()
  assertLoggedIn()
  cy.get(SEL.profileMenuTrigger).last().click({ force: true })
  cy.contains('Logout', { timeout: MODAL_TIMEOUT }).should('be.visible').click({ force: true })
  preparePageForTesting()
  cy.contains(SEL.loginSpan, 'Login', { timeout: NAV_TIMEOUT }).should('be.visible')
}

describe('Studio project full flow', { testIsolation: false }, () => {
  it('1. Login + Create Project', () => {
    projectName = `Cypress Studio ${Date.now()}`
    cy.log(`Project name: ${projectName}`)

    freshLogin()
    cy.intercept('POST', '**/v3/project**').as('createProject')

    cy.visit('/studio/projects')
    ensureStudioSession()
    waitForStudioGridLoaded()

    openCreateProjectModal()
    submitCreateProjectModal()

    cy.wait('@createProject', { timeout: NAV_TIMEOUT }).then(({ response }) => {
      expect(response.statusCode, 'create project API status').to.equal(201)
      expect(response.body?.data?.id, 'create project API id').to.be.a('string').and.not.be.empty
      createdProjectId = response.body.data.id
      cy.wrap(createdProjectId).as('createdProjectId')
    })

    cy.get('@createdProjectId').then((id) => {
      cy.visit(`/studio/projects/${id}`)
      cy.url({ timeout: NAV_TIMEOUT }).should('include', `/studio/projects/${id}`)
    })
    cy.log(`Created project id: ${createdProjectId}`)
  })

  it('2. Import & Upload inside the project', () => {
    expect(createdProjectId, 'project id from test 1').to.be.a('string').and.not.be.empty

    freshLogin()
    cy.visit(`/studio/projects/${createdProjectId}`)
    assertLoggedIn()

    cy.url({ timeout: NAV_TIMEOUT }).should('include', `/studio/projects/${createdProjectId}`)
    openProjectUploadPanel()
    cy.get(SEL.fileInput).first().selectFile(UPLOAD_IMAGE, { force: true })

    cy.log('Waiting for upload confirmation / preview')
    cy.get('body', { timeout: UPLOAD_TIMEOUT }).should(($body) => {
      const text = $body.text()
      const hasPreview = $body.find('img').length > 0
      const hasSuccess =
        /uploaded|upload complete|input\s*[1-9]/i.test(text) ||
        /results?\s*[1-9]/i.test(text) ||
        /magic complete|applying magic/i.test(text)

      expect(hasPreview || hasSuccess, 'upload should show preview or success state').to.be.true
    })
  })

  it('3. Studio sort options + Load More + counters', () => {
    freshLogin()
    cy.visit('/studio/projects')
    ensureStudioSession()
    waitForStudioGridLoaded()

    cy.get('body').then(($body) => {
      const { projects, files } = parseHeaderCounts($body.text())
      cy.log(`Header counts — Projects: ${projects}, Files: ${files}`)
      expect(projects, 'Projects header count').to.be.a('number').and.at.least(0)
      expect(files, 'Files header count').to.be.a('number').and.at.least(0)
      expect(Number.isNaN(projects), 'Projects count should be parseable').to.be.false
      expect(Number.isNaN(files), 'Files count should be parseable').to.be.false
    })

    const sortOptions = ['Newest', 'Latest', 'Last Modified']
    sortOptions.forEach((option) => {
      cy.log(`Testing sort: ${option}`)
      openSortControlNear()
      selectSortOption(option)
      assertGridHasItems(`Projects sort "${option}"`)
    })

    countVisibleProjectCards().then((beforeCount) => {
      cy.get('body').then(($body) => {
        const loadMoreBtn = [...$body.find('button')].find(
          (el) => /load more/i.test(el.textContent || '') && Cypress.dom.isVisible(el),
        )

        if (!loadMoreBtn) {
          cy.log('Load More not visible — skipping (likely all items already shown)')
          return
        }

        cy.log('Clicking Load More')
        cy.wrap(loadMoreBtn).click({ force: true })
        cy.get('[aria-busy="true"]', { timeout: NAV_TIMEOUT }).should('not.exist')

        countVisibleProjectCards().then((afterCount) => {
          expect(afterCount, 'item count after Load More').to.be.at.least(beforeCount)
        })
      })
    })
  })

  it('4. Logout + Create Project triggers signup modal', () => {
    freshLogin()
    cy.visit('/studio/projects')
    ensureStudioSession()
    waitForStudioGridLoaded()

    logoutViaProfileMenu()

    cy.visit('/studio/projects')
    preparePageForTesting()

    cy.contains('button', 'Create Project', { timeout: NAV_TIMEOUT }).scrollIntoView().click({ force: true })

    cy.get('[role="dialog"]', { timeout: MODAL_TIMEOUT }).should('be.visible')
    cy.get('body').should(($body) => {
      const text = $body.text()
      const isAuthModal =
        /welcome back/i.test(text) ||
        /sign up/i.test(text) ||
        /create an account/i.test(text) ||
        /create account/i.test(text) ||
        /log in with email/i.test(text)

      expect(isAuthModal, 'logged-out Create Project should open auth modal').to.be.true
      expect(text.includes('New Project'), 'project form should not open without auth').to.be.false
    })
  })
})
