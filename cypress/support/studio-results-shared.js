/**
 * Studio — result page sidebar (Add to Project, Open Project, Upload New Photo)
 */

const { createStudioMoveHelpers, STUDIO_SEL } = require('./studio-move-shared')

const UPLOAD_IMAGE = 'cypress/fixtures/images/vs-test-room.jpg'
const PANEL_TIMEOUT = 120000
const SYNC_TIMEOUT = 180000

const uniqueImageToken = (imageSrc) =>
  imageSrc.match(/(czM6L[A-Za-z0-9+/=_-]+)/)?.[1] ||
  imageSrc.match(/cb:(\d+)/)?.[1] ||
  imageSrc.split('/').pop()

function createStudioResultsHelpers(sessionId = 'studio-results') {
  const studio = createStudioMoveHelpers(sessionId)
  const { flow } = studio

  const waitForBusyDone = () => {
    cy.get('[aria-busy="true"]', { timeout: SYNC_TIMEOUT }).should('not.exist')
  }

  const goToStudioProjects = () => {
    studio.visitStudioProjectsWithRetry()
    studio.waitForSingleFilesReady()
  }

  const openSingleFileWithResults = (minResults = 1) => {
    goToStudioProjects()

    studio.singleFileCards().then(($cards) => {
      const match = [...$cards].find((card) => {
        const count = (card.textContent || '').match(/(\d+)\s+results?/i)
        return count && Number(count[1]) >= minResults
      })
      expect(match, `single file card with at least ${minResults} result(s)`).to.exist
      cy.wrap(match).scrollIntoView().click({ force: true })
    })

    assertResultPageReady()
  }

  const assertResultPageReady = () => {
    cy.url({ timeout: PANEL_TIMEOUT }).should('match', /order_id=|\/generate|\/results/)
    waitForBusyDone()
    cy.contains('button', /^Download$/i, { timeout: PANEL_TIMEOUT }).should('be.visible')
  }

  const captureHeroImageSrc = () =>
    cy.get('img[src*="cdn.aihomedesign.com"]').then(($imgs) => {
      const hero = [...$imgs].find((img) => {
        const rect = img.getBoundingClientRect()
        return Cypress.dom.isVisible(img) && rect.width > 200
      })
      expect(hero, 'hero result image').to.exist
      return cy.wrap(hero.getAttribute('src'))
    })

  const openAddToProjectPanel = () => {
    cy.contains('button', /^Add to project$/i, { timeout: 30000 }).click({ force: true })
    cy.contains(/your studio|select a project/i, { timeout: 30000 }).should('be.visible')
  }

  const fetchProjectFromListApi = (projectName) => {
    cy.intercept('GET', '**/v3/project**').as('projectList')

    return cy.wait('@projectList', { timeout: 60000 }).then(({ response }) => {
      const projects = response?.body?.data || []
      const project = projects.find((item) => item.address === projectName)
      expect(project, `project "${projectName}" in API list`).to.exist
      return cy.wrap(project)
    })
  }

  const assertProjectListContains = (projectName) => {
    cy.contains(projectName, { timeout: 30000 }).should('be.visible')
  }

  const waitForProjectDetailPanel = () => {
    cy.contains(/review the assets|move your photo here/i, { timeout: PANEL_TIMEOUT }).should(
      'be.visible',
    )
    waitForBusyDone()
    cy.get('body', { timeout: PANEL_TIMEOUT }).should(($body) => {
      const text = $body.text()
      expect(text.includes('Loading') && text.includes('Hang tight'), 'project assets loading').to.be
        .false
    })
  }

  const parseDetailPanelCounts = () =>
    cy.get('body').then(($body) => {
      const panelRoot =
        [...$body.find('aside, [role="dialog"], div')].find((el) => {
          const t = el.textContent || ''
          return /review the assets|move your photo here/i.test(t) && Cypress.dom.isVisible(el)
        }) || $body[0]

      const panelText = panelRoot.textContent || $body.text()
      const countMatches = [...panelText.matchAll(/(\d+)/g)].map((match) => Number(match[1]))

      return {
        input: Number(panelText.match(/Input[^\d]*(\d+)/i)?.[1] ?? NaN),
        results: Number(panelText.match(/Results[^\d]*(\d+)/i)?.[1] ?? NaN),
        bookmark: Number(panelText.match(/Bookmark[^\d]*(\d+)/i)?.[1] ?? NaN),
        numericHints: countMatches,
      }
    })

  const assertDetailPanelCountsMatchApi = (project) => {
    parseDetailPanelCounts().then((counts) => {
      if (!Number.isNaN(counts.input)) {
        expect(counts.input, 'detail panel Input count').to.equal(project.input_count)
        expect(counts.results, 'detail panel Results count').to.equal(project.result_count)
        expect(counts.bookmark, 'detail panel Bookmark count').to.equal(project.bookmarked_count)
        return
      }

      cy.get('body').should(($body) => {
        const text = $body.text()
        expect(text, 'panel should show input count').to.include(String(project.input_count))
        expect(text, 'panel should show result count').to.include(String(project.result_count))
        expect(text, 'panel should show bookmark count').to.include(String(project.bookmarked_count))
      })
    })
  }

  const assertDetailPanelShowsProjectPhotos = (project) => {
    const coverToken = uniqueImageToken(project.cover_src || '')

    cy.get('body').should(($body) => {
      const visibleProjectImages = [...$body.find('img[src*="cdn.aihomedesign.com"]')].filter(
        (img) => {
          const rect = img.getBoundingClientRect()
          return Cypress.dom.isVisible(img) && rect.width > 40 && rect.width < 260
        },
      )

      expect(visibleProjectImages.length, 'project preview thumbnails in detail panel').to.be.at.least(
        project.input_count > 0 || project.result_count > 0 ? 1 : 0,
      )

      if (coverToken) {
        const hasCover = visibleProjectImages.some((img) =>
          (img.getAttribute('src') || '').includes(coverToken),
        )
        expect(hasCover, 'selected project cover/preview should appear in panel').to.be.true
      }
    })
  }

  const selectProjectInAddPanel = (projectName) => {
    openAddToProjectPanel()
    assertProjectListContains(projectName)
    cy.contains(projectName).click({ force: true })
    waitForProjectDetailPanel()
  }

  const createProjectInAddPanel = (projectName) => {
    openAddToProjectPanel()
    cy.contains(/create new project/i).click({ force: true })
    cy.contains(/create a new project to continue/i, { timeout: 30000 }).should('be.visible')
    cy.get('[role="dialog"]:visible input[type="text"]:visible, input[type="text"]:visible')
      .first()
      .clear({ force: true })
      .type(projectName, { force: true })
    cy.intercept('POST', '**/v3/project**').as('createProjectInPanel')
    cy.contains('button', /^Create Project$/i).click({ force: true })
    return cy.wait('@createProjectInPanel', { timeout: 60000 }).then(({ response }) => {
      expect(response?.statusCode, 'create project in panel').to.equal(201)
      const project = response.body.data
      waitForProjectDetailPanel()
      return cy.wrap(project)
    })
  }

  const clickMoveHere = () => {
    cy.contains('button', /^Move Here$/i, { timeout: 30000 }).should('be.visible').click({ force: true })
    cy.contains(/keep editing|open project/i, { timeout: PANEL_TIMEOUT }).should('be.visible')
    cy.contains('button', /open project/i, { timeout: PANEL_TIMEOUT }).should('be.visible')
  }

  const clickOpenProject = () => {
    cy.contains('button', /open project/i, { timeout: 30000 }).click({ force: true })
    cy.url({ timeout: PANEL_TIMEOUT }).should('match', /\/studio\/projects\//)
    waitForBusyDone()
    flow.prepareSiteForTesting()
  }

  const captureResultOrderId = () =>
    cy.url().then((url) => {
      const orderId = new URL(url).searchParams.get('order_id')
      expect(orderId, 'result page order_id').to.be.a('string').and.not.be.empty
      return cy.wrap(orderId)
    })

  const assertResultVisibleInProject = (projectId, orderId) => {
    cy.url().should('include', projectId)
    waitForBusyDone()
    cy.get('[aria-busy="true"]', { timeout: SYNC_TIMEOUT }).should('not.exist')

    if (orderId) {
      cy.get('body', { timeout: PANEL_TIMEOUT }).should(($body) => {
        const hasOrderLink = $body.find(`a[href*="order_id=${orderId}"]`).length > 0
        const hasResultCards = /\d+\s+results?/i.test($body.text())
        expect(hasOrderLink || hasResultCards, 'project should show moved result asset').to.be.true
      })
      return
    }

    cy.get('img[src*="cdn.aihomedesign.com"]')
      .filter(':visible')
      .should('have.length.at.least', 1)
  }

  const seedProjectWithUpload = (projectId) => {
    cy.visit(`/studio/projects/${projectId}`)
    flow.prepareSiteForTesting()
    waitForBusyDone()

    cy.get('body').then(($body) => {
      if (/add your first image/i.test($body.text())) {
        cy.contains(/add your first image/i).click({ force: true })
      }
    })

    cy.contains('button', /^Import$/i, { timeout: 60000 }).click({ force: true })
    cy.get(STUDIO_SEL.fileInput, { timeout: 30000 }).should('exist')
    cy.get(STUDIO_SEL.fileInput).first().selectFile(UPLOAD_IMAGE, { force: true })

    cy.get('body', { timeout: SYNC_TIMEOUT }).should(($body) => {
      const text = $body.text()
      expect(
        /uploaded|upload complete|\d+\s*\/\s*1|input\s*[1-9]/i.test(text) ||
          $body.find('img[src*="cdn.aihomedesign.com"]').length > 0,
        'project should show uploaded input photo',
      ).to.be.true
    })
  }

  const openResultFromProject = (projectId) => {
    cy.visit(`/studio/projects/${projectId}`)
    flow.prepareSiteForTesting()
    waitForBusyDone()

    cy.get('a[href*="order_id="]', { timeout: PANEL_TIMEOUT })
      .first()
      .scrollIntoView()
      .click({ force: true })

    assertResultPageReady()
    cy.contains('button', /open project/i, { timeout: PANEL_TIMEOUT }).should('be.visible')
  }

  const openUploadNewPhotoPanel = () => {
    cy.contains('button', /^Upload new photo$/i, { timeout: 30000 }).click({ force: true })
    cy.contains('Upload Assets', { timeout: 30000 }).should('be.visible')
    cy.contains(/choose or upload the media you want to work on/i).should('be.visible')
  }

  const assertUploadPanelTabs = () => {
    ;['All', 'Bookmark', 'Input', 'Results'].forEach((tab) => {
      cy.contains('button', new RegExp(`^${tab}$`, 'i')).should('be.visible')
    })
    cy.contains(/add your photos|browse from device|upload/i).should('be.visible')
  }

  const selectExistingPhotoInUploadPanel = (tab = 'Input') => {
    cy.contains('button', new RegExp(`^${tab}$`, 'i')).click({ force: true })
    waitForBusyDone()

    return cy
      .get('img[src*="cdn.aihomedesign.com"]')
      .filter(':visible')
      .then(($imgs) => {
        const thumb = [...$imgs].find((img) => {
          const rect = img.getBoundingClientRect()
          return rect.width >= 40 && rect.width <= 220
        })
        expect(thumb, `thumbnail in ${tab} tab`).to.exist
        const src = thumb.getAttribute('src')
        cy.wrap(thumb).click({ force: true })
        return cy.wrap(src)
      })
  }

  const uploadNewPhotoInPanel = () => {
    cy.get(STUDIO_SEL.fileInput, { timeout: 30000 }).first().selectFile(UPLOAD_IMAGE, { force: true })
    flow.waitForUploadComplete()
  }

  const assertPhotoInProject = (imageSrc, projectId) => {
    cy.visit(`/studio/projects/${projectId}`)
    flow.prepareSiteForTesting()
    waitForBusyDone()
    studio.assertImageInOpenProject(imageSrc)
  }

  const assertPhotoInSingleFiles = (imageSrc) => {
    studio.visitStudioProjectsWithRetry()
    studio.waitForSingleFilesReady()
    const token = uniqueImageToken(imageSrc)

    cy.get(STUDIO_SEL.singleFileCard)
      .filter(`:has(img[src*="${token}"])`)
      .should('have.length.at.least', 1)
  }

  return {
    studio,
    flow,
    UPLOAD_IMAGE,
    ensureLoggedIn: studio.ensureLoggedIn,
    createTargetProject: studio.createTargetProject,
    openSingleFileWithResults,
    assertResultPageReady,
    captureHeroImageSrc,
    captureResultOrderId,
    openAddToProjectPanel,
    fetchProjectFromListApi,
    assertProjectListContains,
    selectProjectInAddPanel,
    createProjectInAddPanel,
    assertDetailPanelCountsMatchApi,
    assertDetailPanelShowsProjectPhotos,
    clickMoveHere,
    clickOpenProject,
    assertResultVisibleInProject,
    seedProjectWithUpload,
    openResultFromProject,
    openUploadNewPhotoPanel,
    assertUploadPanelTabs,
    selectExistingPhotoInUploadPanel,
    uploadNewPhotoInPanel,
    assertPhotoInProject,
    assertPhotoInSingleFiles,
    uniqueImageToken,
  }
}

module.exports = {
  createStudioResultsHelpers,
  UPLOAD_IMAGE,
}
