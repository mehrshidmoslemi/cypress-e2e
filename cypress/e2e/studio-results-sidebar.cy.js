/**
 * Studio Results Sidebar E2E
 *
 * Account: memoslemi.sdstudio+1025@gmail.com / 12345678
 * Flows: Add to Project (existing + new), Open Project, Upload New Photo panel
 */

const { createStudioResultsHelpers } = require('../support/studio-results-shared')

const results = createStudioResultsHelpers('studio-results-sidebar')

describe('Studio — results sidebar flows', { testIsolation: false }, () => {
  let targetProjectId = null
  let movedOrderId = null
  let newProjectId = null
  let newProjectName = null

  it('1. Add to Project → move to existing project → Open Project', () => {
    const targetProjectName = `Cypress Sidebar Existing ${Date.now()}`

    results.ensureLoggedIn()
    results.createTargetProject(targetProjectName).then((projectId) => {
      targetProjectId = projectId
      results.seedProjectWithUpload(projectId)

      results.openSingleFileWithResults()
      results.captureResultOrderId().then((orderId) => {
        movedOrderId = orderId

        cy.intercept('GET', '**/v3/project**').as('projectList')
        results.openAddToProjectPanel()
        cy.wait('@projectList', { timeout: 60000 }).then(({ response }) => {
          const project = (response?.body?.data || []).find((item) => item.address === targetProjectName)
          expect(project, 'target project in list API').to.exist

          results.assertProjectListContains(targetProjectName)
          cy.contains(targetProjectName).click({ force: true })
          cy.contains(/review the assets|move your photo here/i).should('be.visible')

          results.assertDetailPanelCountsMatchApi(project)
          results.assertDetailPanelShowsProjectPhotos(project)
        })

        results.clickMoveHere()
        results.clickOpenProject()
        results.assertResultVisibleInProject(targetProjectId, movedOrderId)
      })
    })
  })

  it('2. Add to Project → create new project → verify photo transfer', () => {
    newProjectName = `Cypress Sidebar New ${Date.now()}`

    results.openSingleFileWithResults()
    results.captureResultOrderId().then((orderId) => {
      movedOrderId = orderId
    })

    results.createProjectInAddPanel(newProjectName).then((project) => {
      newProjectId = project.id
      results.clickMoveHere()
      results.clickOpenProject()
      results.assertResultVisibleInProject(newProjectId, movedOrderId)
      cy.get('body').should('contain.text', newProjectName)
    })
  })

  it('3. Open Project from project results page redirects correctly', () => {
    expect(targetProjectId, 'project id from flow 1').to.be.a('string').and.not.be.empty

    results.openResultFromProject(targetProjectId)
    results.captureResultOrderId().then((orderId) => {
      results.clickOpenProject()
      cy.url({ timeout: 60000 }).should('include', `/studio/projects/${targetProjectId}`)
      cy.get('body').should(($body) => {
        expect($body.text()).to.not.match(/server error|something went wrong|\(500\)/i)
      })
      results.assertResultVisibleInProject(targetProjectId, orderId)
    })
  })

  it('4. Upload New Photo panel — tabs, existing photo, new upload', () => {
    results.openSingleFileWithResults()
    results.openUploadNewPhotoPanel()
    results.assertUploadPanelTabs()

    results.selectExistingPhotoInUploadPanel('Input').then((selectedSrc) => {
      expect(selectedSrc, 'selected existing photo src').to.match(/^https?:\/\//)
      cy.get('body').type('{esc}', { force: true })
      results.assertResultPageReady()
    })

    results.openUploadNewPhotoPanel()
    results.uploadNewPhotoInPanel()
    cy.get('body').type('{esc}', { force: true })
    results.assertResultPageReady()

    expect(newProjectId, 'project id from flow 2').to.be.a('string').and.not.be.empty
    results.openResultFromProject(newProjectId)
    results.openUploadNewPhotoPanel()
    results.assertUploadPanelTabs()
    results.uploadNewPhotoInPanel()
    cy.get('body').type('{esc}', { force: true })
    cy.url().should('match', /order_id=|\/studio\/projects\//)
  })
})
