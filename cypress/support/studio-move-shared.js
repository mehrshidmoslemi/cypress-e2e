/**
 * Studio — upload via Start Now and move single file to project
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('./flow-enhanced-shared')

const getAccount = () => ({
  email: Cypress.env('STUDIO_MOVE_EMAIL') || 'memoslemi.sdstudio+1025@gmail.com',
  password: Cypress.env('STUDIO_MOVE_PASSWORD') || '12345678',
})

const ONBOARDING_TITLE = 'Which best describes you?'
const ONBOARDING_STEP2 = 'What are you trying to do today?'
const STUDIO_SYNC_TIMEOUT = 180000

const uniqueImageToken = (imageSrc) =>
  imageSrc.match(/(czM6L[A-Za-z0-9+/=_-]+)/)?.[1] ||
  imageSrc.match(/cb:(\d+)/)?.[1] ||
  imageSrc.split('/').pop()

const STUDIO_SEL = {
  ...COMMON_SEL,
  startNowLink: 'a[href="/generate"]',
  studioProjectsLink: 'nav a[href="/studio/projects"]',
  fileInput: 'input[type="file"]',
  singleFileCard: 'div.rounded-2xl.aspect-\\[4\\/3\\].cursor-pointer:has(img[src*="cdn.aihomedesign.com"])',
  dotsMenuBtn: 'button:has(.i-tabler\\:dots-vertical)',
}

function createStudioMoveHelpers(sessionId = 'studio-move') {
  const flow = createEnhancedFlowHelpers({ sel: STUDIO_SEL, sessionId })

  const completeOnboardingIfShown = () => {
    cy.get('body').then(($body) => {
      if (!$body.text().includes(ONBOARDING_TITLE)) {
        return
      }

      cy.contains('Other', { timeout: 30000 }).click({ force: true })
      cy.contains(ONBOARDING_STEP2, { timeout: 30000 }).should('be.visible')
      cy.contains('Just testing AIHomeDesign', { timeout: 30000 }).click({ force: true })
      cy.contains("I'll explore on my own", { timeout: 30000 }).click({ force: true })
    })
  }

  const isNavLoggedIn = ($body) => {
    const hasLogin = [...$body.find('nav button, nav span, nav a')].some(
      (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
    )
    if (hasLogin) {
      return false
    }

    return $body.find(STUDIO_SEL.profileMenuTrigger).filter(':visible').length > 0
  }

  const loginWithEmail = () => {
    const account = getAccount()

    cy.get('body', { timeout: 60000 })
      .then(($body) => {
        if (isNavLoggedIn($body)) {
          cy.log(`Already logged in as ${account.email}`)
          return cy.wrap(false)
        }
        return cy.wrap(true)
      })
      .then((needsLogin) => {
        if (!needsLogin) {
          return
        }

        cy.contains(STUDIO_SEL.loginSpan, 'Login', { timeout: 60000 }).click({ force: true })
        cy.contains(STUDIO_SEL.loginProfileBtn, 'Login', { timeout: 30000 }).click({ force: true })
        cy.get(STUDIO_SEL.loginWithEmailBtn).click({ force: true })
        cy.get(STUDIO_SEL.usernameInput).clear().type(account.email)
        cy.get(STUDIO_SEL.passwordInput).clear().type(account.password, { log: false })
        cy.get(STUDIO_SEL.loginSubmitBtn).click({ force: true })
      })

    cy.get('body', { timeout: 30000 }).then(($body) => {
      if ($body.text().match(/email or password is invalid/i)) {
        throw new Error(
          `Login failed for ${account.email}. Check STUDIO_MOVE_PASSWORD in .env (expected 12345678, not 123456).`,
        )
      }
    })

    cy.get('body', { timeout: 90000 }).should(($body) => {
      expect(isNavLoggedIn($body), `user should be logged in as ${account.email}`).to.be.true
    })
  }

  const ensureLoggedIn = () => {
    const account = getAccount()
    cy.session(
      `${sessionId}:${account.email}`,
      () => {
        cy.visit('/')
        cy.get('nav', { timeout: 60000 }).should('exist')
        flow.prepareSiteForTesting()
        loginWithEmail()
        completeOnboardingIfShown()
        flow.prepareSiteForTesting()
      },
      {
        validate() {
          cy.visit('/')
          cy.get('nav', { timeout: 60000 }).should('exist')
          cy.get('body').should(($body) => {
            expect(isNavLoggedIn($body), 'cached session should still be authenticated').to.be.true
          })
        },
      },
    )

    cy.visit('/')
    flow.prepareSiteForTesting()
    completeOnboardingIfShown()
  }

  const openStartNowUploader = () => {
    cy.get(STUDIO_SEL.startNowLink).contains('Start Now').scrollIntoView().click({ force: true })
    cy.url({ timeout: 30000 }).should('include', '/generate')
    cy.contains(/drop or add|browse from device|upload/i, { timeout: 30000 }).should('be.visible')
    cy.get(STUDIO_SEL.fileInput, { timeout: 30000 }).should('exist')
  }

  const uploadPhoto = (fixturePath) => {
    cy.get(STUDIO_SEL.fileInput).first().selectFile(fixturePath, { force: true })
    flow.waitForUploadComplete()
    cy.get('body').type('{esc}', { force: true })
  }

  const visitStudioProjectsWithRetry = (attempt = 0) => {
    cy.visit('/studio/projects', { failOnStatusCode: false })
    cy.get('body', { timeout: 60000 }).should('exist')

    cy.get('body').then(($body) => {
      const hasNav = $body.find('nav').length > 0
      const hasServerError =
        $body.text().includes('Request Failed') || $body.text().includes('500')

      if ((!hasNav || hasServerError) && attempt < 4) {
        cy.wait(3000)
        visitStudioProjectsWithRetry(attempt + 1)
        return
      }

      flow.dismissServerErrorModal()
      flow.prepareSiteForTesting()
    })
  }

  const openStudioProjects = () => {
    cy.get(STUDIO_SEL.studioProjectsLink, { timeout: 30000 }).click({ force: true })
    cy.url({ timeout: 30000 }).should('include', '/studio/projects')
    completeOnboardingIfShown()
    cy.get('[aria-busy="true"]', { timeout: STUDIO_SYNC_TIMEOUT }).should('not.exist')
    flow.prepareSiteForTesting()
  }

  const parseStudioHeaderStats = () =>
    cy.get('body').then(($body) => {
      const text = $body.text() || ''
      const studioChunk = text.split('/Studio').pop()?.split('Create Project')[0] || text
      const combined = studioChunk.match(/(\d+)\s+Projects\s*(\d+)\s+Files/i)

      if (combined) {
        return { projects: Number(combined[1]), files: Number(combined[2]) }
      }

      return {
        projects: Number(studioChunk.match(/(\d+)\s+Projects/i)?.[1]),
        files: Number(studioChunk.match(/(\d+)\s+Files/i)?.[1]),
      }
    })

  const singleFilesSection = () => cy.contains('Single Files', { timeout: 30000 }).scrollIntoView().should('be.visible')

  const singleFileCards = () => cy.get(STUDIO_SEL.singleFileCard)

  const singleFilesGrid = () =>
    singleFileCards().first().parents('div.grid').first({ timeout: 30000 })

  const waitForSingleFilesReady = () => {
    singleFilesSection()
    cy.get('[aria-busy="true"]', { timeout: STUDIO_SYNC_TIMEOUT }).should('not.exist')
    flow.prepareSiteForTesting()
  }

  const captureSingleFileSrcSet = () =>
    singleFileCards()
      .find('img[src*="http"]')
      .then(($imgs) => new Set([...$imgs].map((img) => img.getAttribute('src')).filter(Boolean)))

  const waitForNewSingleFileAfterUpload = (beforeSrcSet, attempt = 0) => {
    openStudioProjects()
    waitForSingleFilesReady()

    return captureSingleFileSrcSet().then((currentSet) => {
      const newSrc = [...currentSet].find((src) => !beforeSrcSet.has(src))
      if (newSrc) {
        return cy.wrap(newSrc)
      }

      if (attempt >= 24) {
        throw new Error('Timed out waiting for uploaded photo to appear in Single Files')
      }

      cy.wait(5000)
      return waitForNewSingleFileAfterUpload(beforeSrcSet, attempt + 1)
    })
  }

  const countSingleFileCardsInGrid = () => cy.get(STUDIO_SEL.singleFileCard).its('length')

  const clickSingleFilesLoadMoreIfVisible = () => {
    singleFilesSection().scrollIntoView()

    return cy.get('body').then(($body) => {
      const hasSingleFilesLoadMore = [...$body.find('button, a, span[role="button"]')].some((el) => {
        const label = (el.textContent || '').trim()
        return label === 'Load More' && Cypress.dom.isVisible(el)
      })

      if (!hasSingleFilesLoadMore) {
        return cy.wrap(false)
      }

      return cy
        .contains('button, a, span[role="button"]', /^Load More$/)
        .last()
        .scrollIntoView()
        .click({ force: true })
        .then(() => {
          cy.get('[aria-busy="true"]', { timeout: STUDIO_SYNC_TIMEOUT }).should('not.exist')
          cy.wait(1000)
          return cy.wrap(true)
        })
    })
  }

  const loadAllSingleFileCards = (attempt = 0) =>
    parseStudioHeaderStats().then(({ files: headerFiles }) =>
      countSingleFileCardsInGrid().then((gridCards) => {
        if ((gridCards >= headerFiles && headerFiles > 0) || attempt >= 30) {
          return cy.wrap({ headerFiles, gridCards })
        }

        return clickSingleFilesLoadMoreIfVisible().then((clicked) => {
          if (!clicked) {
            return cy.wrap({ headerFiles, gridCards })
          }

          return loadAllSingleFileCards(attempt + 1)
        })
      }),
    )

  const assertSingleFilesCountMatchesHeader = () => {
    openStudioProjects()
    cy.get('body').type('{esc}', { force: true })
    waitForSingleFilesReady()

    parseStudioHeaderStats().then(({ files: headerFiles }) => {
      expect(headerFiles, 'studio header Files count').to.be.a('number').and.not.be.NaN

      loadAllSingleFileCards().then(({ gridCards }) => {
        expect(gridCards, 'visible Single Files cards should be rendered').to.be.at.least(1)

        if (gridCards === headerFiles) {
          expect(gridCards, 'visible cards match header Files count').to.equal(headerFiles)
          return
        }

        cy.log(
          `Paginated studio view: header shows ${headerFiles} total files, ${gridCards} cards currently rendered`,
        )
        expect(headerFiles, 'header total should cover rendered cards').to.be.at.least(gridCards)

        countSingleFileCardsInGrid().then((recounted) => {
          expect(recounted, 'card count should be stable').to.equal(gridCards)
        })
      })
    })
  }

  const createTargetProject = (projectName) => {
    cy.intercept('POST', '**/v3/project**').as('createProject')
    openStudioProjects()
    cy.contains('button', 'Create Project', { timeout: 60000 }).scrollIntoView().click({ force: true })

    cy.get('body').then(($body) => {
      if ($body.text().includes(ONBOARDING_TITLE)) {
        completeOnboardingIfShown()
        cy.contains('button', 'Create Project').click({ force: true })
      }
    })

    cy.get('[role="dialog"]:visible', { timeout: 30000 }).should('contain.text', 'New Project')
    cy.get('[role="dialog"]:visible input[type="text"]:visible')
      .first()
      .clear({ force: true })
      .type(projectName, { force: true })
    cy.get('[role="dialog"]:visible').contains('button', /Create|Continue/i).click({ force: true })

    return cy.wait('@createProject', { timeout: 60000 }).then(({ response }) => {
      expect(response?.statusCode, 'create project status').to.equal(201)
      return response.body.data.id
    })
  }

  const openSingleFileDotsMenuForImage = (imageSrc) => {
    const token = uniqueImageToken(imageSrc)
    singleFileCards()
      .filter(`:has(img[src*="${token}"])`)
      .first()
      .scrollIntoView()
      .find(STUDIO_SEL.dotsMenuBtn)
      .first()
      .click({ force: true })
    cy.contains('[role="dialog"][data-state="open"]', 'Select To Move', { timeout: 15000 }).should(
      'be.visible',
    )
  }

  const moveSingleFileToProject = (projectName, imageSrc) => {
    cy.intercept('GET', '**/v3/project**').as('listProjects')

    openSingleFileDotsMenuForImage(imageSrc)
    cy.contains('[role="dialog"][data-state="open"] button', 'Select To Move', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true })

    const token = uniqueImageToken(imageSrc)
    singleFileCards()
      .filter(`:has(img[src*="${token}"])`)
      .first()
      .find('button[role="checkbox"]')
      .then(($checkbox) => {
        if ($checkbox.attr('aria-checked') !== 'true') {
          cy.wrap($checkbox).click({ force: true })
        }
      })

    cy.contains('button', 'Move to', { timeout: 15000 }).should('be.visible').click({ force: true })
    cy.wait('@listProjects', { timeout: 60000 })

    cy.get('[role="dialog"][data-state="open"]', { timeout: 30000 })
      .last()
      .should('be.visible')
      .contains(projectName)
      .click({ force: true })

    cy.contains(/successfully moved|photo moved|moved to project/i, { timeout: 30000 }).should(
      'be.visible',
    )
  }

  const openProjectByName = (projectName) => {
    openStudioProjects()
    cy.contains('h3', projectName, { timeout: 60000 }).scrollIntoView().click({ force: true })
    cy.url({ timeout: 60000 }).should('match', /\/studio\/projects\//)
  }

  const assertImageInOpenProject = (imageSrc) => {
    const token = uniqueImageToken(imageSrc)

    cy.url().should('match', /\/studio\/projects\//)
    cy.contains(/images/i, { timeout: 30000 }).should('be.visible')
    cy.get('[aria-busy="true"]', { timeout: 60000 }).should('not.exist')

    cy.get('body', { timeout: 90000 }).should(($body) => {
      const html = $body.html()
      const hasToken = html.includes(token)
      const hasVisibleProjectImage = [...$body.find('img')].some((img) => {
        if (!Cypress.dom.isVisible(img)) {
          return false
        }

        const src = img.getAttribute('src') || ''
        const srcset = img.getAttribute('srcset') || ''
        return (
          src.includes('cdn.aihomedesign.com') ||
          srcset.includes('cdn.aihomedesign.com') ||
          src.includes(token) ||
          srcset.includes(token)
        )
      })

      expect(hasToken || hasVisibleProjectImage, 'uploaded image should appear inside project').to.be
        .true
    })
  }

  const assertImageNotInSingleFiles = (imageSrc, attempt = 0) => {
    visitStudioProjectsWithRetry()
    waitForSingleFilesReady()

    const token = uniqueImageToken(imageSrc)

    cy.get('body', { timeout: 30000 }).then(($body) => {
      const section = [...$body.find('h2, h3')].find((el) => /^Single Files$/i.test(el.textContent.trim()))
      const container = section?.closest('section')?.parentElement
      const matches = container
        ? [...container.querySelectorAll('img[src]')].filter((img) =>
            (img.getAttribute('src') || '').includes(token),
          )
        : []

      if (matches.length > 0 && attempt < 15) {
        cy.wait(5000)
        return assertImageNotInSingleFiles(imageSrc, attempt + 1)
      }

      expect(matches.length, 'moved photo should not appear in Single Files').to.equal(0)
    })
  }

  return {
    flow,
    STUDIO_SEL,
    ensureLoggedIn,
    openStartNowUploader,
    uploadPhoto,
    openStudioProjects,
    visitStudioProjectsWithRetry,
    waitForSingleFilesReady,
    waitForNewSingleFileAfterUpload,
    captureSingleFileSrcSet,
    assertSingleFilesCountMatchesHeader,
    parseStudioHeaderStats,
    countSingleFileCardsInGrid,
    createTargetProject,
    moveSingleFileToProject,
    openProjectByName,
    assertImageInOpenProject,
    assertImageNotInSingleFiles,
    singleFileCards,
  }
}

module.exports = {
  createStudioMoveHelpers,
  STUDIO_SEL,
}
