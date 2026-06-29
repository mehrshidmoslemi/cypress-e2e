/**
 * Studio bulk project flow
 *
 * Upload several photos via VS bulk uploader → auto-create Studio project
 * → verify input/result counts in upload preview and Studio project (API + UI).
 *
 * Fixtures: cypress/fixtures/bulk-upload-images.json
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  vsHomeCard: '#v5-home-tool-virtual-staging-card',
  fileInput: 'input[type="file"]',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'studio-bulk-project',
})

const PAID_ACCOUNT = {
  email: 'memoslemi.sdstudio+10000@gmail.com',
  password: '12345678',
}

const IMAGE_COUNT = 3
const UPLOAD_TIMEOUT = 180000
const POLL_INTERVAL_MS = 5000
const MAX_POLL_ATTEMPTS = 180

let bulkImagePaths = []

const loginWithEmail = (email, password) => {
  cy.contains(SEL.loginSpan, 'Login', { timeout: 60000 }).click({ force: true })
  cy.contains(SEL.loginProfileBtn, 'Login', { timeout: 30000 }).click({ force: true })
  cy.get(SEL.loginWithEmailBtn).click({ force: true })
  cy.get(SEL.usernameInput).clear().type(email)
  cy.get(SEL.passwordInput).clear().type(password, { log: false })
  cy.get(SEL.loginSubmitBtn).click({ force: true })
  cy.get('body', { timeout: 20000 }).should(($body) => {
    expect($body.text()).to.not.match(/email or password is invalid/i)
  })
  cy.get(SEL.profileMenuTrigger, { timeout: 90000 }).should('be.visible')
  cy.get('nav').contains(/^Login$/).should('not.exist')
}

const loginAsPaid = () => {
  cy.clearCookies()
  cy.visit('/')
  flow.prepareSiteForTesting()
  loginWithEmail(PAID_ACCOUNT.email, PAID_ACCOUNT.password)
  flow.prepareSiteForTesting()
}

const openBulkUploader = () => {
  cy.get(SEL.vsHomeCard).scrollIntoView().click({ force: true })
  cy.contains(/drop or add several photos/i, { timeout: 30000 }).should('be.visible')
  cy.get(SEL.fileInput, { timeout: 30000 }).should('exist')
}

const uploadBulkImages = (count) => {
  cy.get(SEL.fileInput).first().selectFile(bulkImagePaths.slice(0, count), { force: true })
}

const assertUploadPanelUploaded = (count) => {
  cy.contains('Upload Assets', { timeout: UPLOAD_TIMEOUT }).should('be.visible')
  cy.get('body').should(($body) => {
    expect($body.text()).to.match(new RegExp(`uploaded\\s*${count}\\s*\\/\\s*${count}`, 'i'))
  })
}

const readPreviewTabCounts = (text) => {
  const input = text.match(/Input\s*(\d+)/i)?.[1]
  const results = text.match(/Results\s*(\d+)/i)?.[1]
  return {
    input: input ? Number(input) : null,
    results: results ? Number(results) : null,
  }
}

const assertPreviewTabCounts = (inputCount, resultCount = null) => {
  cy.contains('Upload Assets', { timeout: 60000 }).should('be.visible')
  cy.get('body').should(($body) => {
    const { input, results } = readPreviewTabCounts($body.text())
    if (input !== null) {
      expect(input, 'preview Input tab count').to.equal(inputCount)
    }
    if (resultCount !== null && results !== null) {
      expect(results, 'preview Results tab count').to.equal(resultCount)
    }
    expect($body.text()).to.include('Input')
    expect($body.text()).to.include('Results')
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

const pollProjectCounts = (projectId, expected, attempt = 0) => {
  cy.intercept('GET', '**/v3/project?*').as('projectList')
  cy.visit('/studio/projects')
  flow.prepareSiteForTesting()
  return cy.wait('@projectList', { timeout: 120000 }).then(({ response }) => {
    const project = findProjectInList(response, projectId)
    const counts = projectCounts(project)

    const inputsReady = project && counts.input === expected.inputCount
    const resultsReady =
      expected.resultCount === undefined || counts.result === expected.resultCount

    if (inputsReady && resultsReady) {
      return cy.wrap(project)
    }

    if (attempt >= MAX_POLL_ATTEMPTS) {
      throw new Error(
        `Timed out waiting for project counts. Last state: ${JSON.stringify(project)}`,
      )
    }

    cy.wait(POLL_INTERVAL_MS)
    return pollProjectCounts(projectId, expected, attempt + 1)
  })
}

const projectsSectionHeading = () =>
  cy.get('h2, h3').filter((_, el) => /^Projects$/i.test(el.textContent.trim())).first()

const waitForProjectsGridLoaded = () => {
  projectsSectionHeading().scrollIntoView().should('be.visible')
  cy.get('h2, h3')
    .filter((_, el) => /^Single Files$/i.test(el.textContent.trim()))
    .first()
    .should('be.visible')
  cy.get('[aria-busy="true"]', { timeout: 120000 }).should('not.exist')
  cy.get('h3').contains('My Photos', { timeout: 60000 }).should('be.visible')
  flow.prepareSiteForTesting()
}

const getProjectCardWithCounts = (inputCount, resultCount) => {
  return cy
    .get('h3')
    .contains('My Photos')
    .first()
    .parents('div')
    .should(($parents) => {
      const card = [...$parents].find((el) => {
        const text = el.innerText || el.textContent || ''
        return text.includes('My Photos') && matchesProjectCardCounts(text, inputCount, resultCount)
      })
      expect(card, 'newest project card with input/output counts').to.exist
    })
}

const matchesProjectCardCounts = (text, inputCount, resultCount) => {
  const compact = text.replace(/\s+/g, '')
  if (compact.includes(`${inputCount}${resultCount}`)) {
    return true
  }

  const hasInput = new RegExp(`(^|\\D)${inputCount}(\\D|$)`).test(text)
  const hasResult = new RegExp(`(^|\\D)${resultCount}(\\D|$)`).test(text)
  return hasInput && hasResult
}

const assertStudioProjectCardCounts = (project, inputCount, resultCount) => {
  const counts = projectCounts(project)
  expect(counts.input, 'API input_count').to.equal(inputCount)
  expect(counts.result, 'API result_count').to.equal(resultCount)

  cy.visit('/studio/projects')
  flow.prepareSiteForTesting()
  waitForProjectsGridLoaded()
  getProjectCardWithCounts(inputCount, resultCount)
}

const clickNewestProjectCard = (inputCount, resultCount) => {
  cy.get('h3')
    .contains('My Photos')
    .first()
    .parents('div')
    .then(($parents) => {
      const card = [...$parents].find((el) => {
        const text = el.innerText || el.textContent || ''
        return text.includes('My Photos') && matchesProjectCardCounts(text, inputCount, resultCount)
      })
      expect(card, 'project card to open overview').to.exist
      cy.wrap(card).click({ force: true })
    })

  cy.url({ timeout: 30000 }).should('match', /\/studio\/projects\/[^/?#]+$/)
  cy.contains(/project overview/i, { timeout: 60000 }).should('be.visible')
}

const openStudioProjectOverview = (inputCount, resultCount) => {
  clickNewestProjectCard(inputCount, resultCount)
}

const assertProjectOverviewCounts = (project, inputCount, resultCount) => {
  cy.contains(/project overview/i, { timeout: 30000 }).should('be.visible')
  cy.get('body').should(($body) => {
    const text = $body.text()
    expect(text).to.include(String(inputCount))
    expect(text).to.include(String(resultCount))
    expect(text).not.to.include('Unable to load project')
  })

  const counts = projectCounts(project)
  expect(counts.input, 'API input_count on overview').to.equal(inputCount)
  expect(counts.result, 'API result_count on overview').to.equal(resultCount)
}

describe('Studio bulk project', () => {
  before(() => {
    cy.fixture('bulk-upload-images').then(({ images }) => {
      bulkImagePaths = images.map(({ fixture }) => `cypress/fixtures/${fixture}`)
      expect(bulkImagePaths.length).to.be.at.least(IMAGE_COUNT)
    })
  })

  it('creates a studio project with correct input/output counts after bulk upload', () => {
    cy.intercept('POST', '**/v3/project?*').as('createProject')

    loginAsPaid()
    openBulkUploader()
    uploadBulkImages(IMAGE_COUNT)

    cy.wait('@createProject', { timeout: 120000 }).then(({ response }) => {
      expect(response.statusCode, 'project create status').to.equal(201)
      cy.wrap(response.body.data).as('createdProject')
    })

    assertUploadPanelUploaded(IMAGE_COUNT)
    assertPreviewTabCounts(IMAGE_COUNT)

    cy.get('@createdProject').then((project) => {
      pollProjectCounts(project.id, { inputCount: IMAGE_COUNT })
        .then((listedProject) => {
          expect(projectCounts(listedProject).input, 'API input_count after upload').to.equal(
            IMAGE_COUNT,
          )
          return pollProjectCounts(project.id, {
            inputCount: IMAGE_COUNT,
            resultCount: IMAGE_COUNT,
          })
        })
        .then((completedProject) => {
          expect(
            projectCounts(completedProject).result,
            'API result_count after generation',
          ).to.equal(IMAGE_COUNT)
          cy.wrap(completedProject).as('completedProject')
        })
    })

    cy.get('@createdProject').then((created) => {
      cy.get('@completedProject').then((listed) => {
        const project = { ...created, ...listed }

        assertStudioProjectCardCounts(project, IMAGE_COUNT, IMAGE_COUNT)
        openStudioProjectOverview(IMAGE_COUNT, IMAGE_COUNT)
        assertProjectOverviewCounts(project, IMAGE_COUNT, IMAGE_COUNT)
      })
    })
  })
})
