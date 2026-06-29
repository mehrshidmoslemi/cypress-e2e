/**
 * Studio E2E — Login → Upload → Single Files → Move to Project → Verify
 *
 * Account: memoslemi.sdstudio+1025@gmail.com
 * Password: set STUDIO_MOVE_PASSWORD (default 12345678; override via Cypress env)
 * Fixture: cypress/fixtures/images/vs-test-room.jpg
 */

const { createStudioMoveHelpers } = require('../support/studio-move-shared')

const studio = createStudioMoveHelpers('studio-upload-move')
const UPLOAD_IMAGE = 'cypress/fixtures/images/vs-test-room.jpg'

describe('Studio — upload and move to project', () => {
  it('logs in, uploads a photo, moves it to a project, and verifies counts', () => {
    const targetProjectName = `Cypress Move Target ${Date.now()}`

    // ── 1. Login ─────────────────────────────────────────────────────────────
    studio.ensureLoggedIn()
    cy.get('nav', { timeout: 60000 }).should('exist')
    cy.get(studio.STUDIO_SEL.profileMenuTrigger).should('be.visible')

    // ── 2. Create target project (required for "Move to" existing project) ─
    studio.createTargetProject(targetProjectName).as('targetProjectId')

    // ── 3. Capture Single Files baseline before upload ───────────────────────
    studio.openStudioProjects()
    studio.captureSingleFileSrcSet().as('srcSetBeforeUpload')

    // ── 4. Start uploader and upload one photo ───────────────────────────────
    cy.visit('/')
    studio.flow.prepareSiteForTesting()
    studio.openStartNowUploader()
    studio.uploadPhoto(UPLOAD_IMAGE)

    // ── 5. Studio → Single Files: uploaded photo appears ─────────────────────
    cy.get('@srcSetBeforeUpload').then((srcSetBeforeUpload) => {
      studio.waitForNewSingleFileAfterUpload(srcSetBeforeUpload).as('uploadedImageSrc')
    })

    cy.get('@uploadedImageSrc').then((uploadedImageSrc) => {
      const token = uploadedImageSrc.match(/cb:(\d+)/)?.[1] || uploadedImageSrc.split('/').pop()
      studio.singleFileCards().filter(`:has(img[src*="${token}"])`).should('have.length', 1)
    })

    // ── 6. Move photo to existing project via three-dots menu ────────────────
    cy.get('@uploadedImageSrc').then((uploadedImageSrc) => {
      studio.moveSingleFileToProject(targetProjectName, uploadedImageSrc)
    })

    // ── 7. Verify photo exists inside the project ────────────────────────────
    cy.get('@uploadedImageSrc').then((uploadedImageSrc) => {
      cy.get('@targetProjectId').then((targetProjectId) => {
        studio.openProjectByName(targetProjectName)
        cy.url().should('include', targetProjectId)
        studio.assertImageInOpenProject(uploadedImageSrc)
      })
    })

    // ── 8. Single Files no longer shows the moved photo ──────────────────────
    cy.get('@uploadedImageSrc').then((uploadedImageSrc) => {
      studio.assertImageNotInSingleFiles(uploadedImageSrc)
    })

    // ── 9. Header file count matches Single Files grid card count ─────────────
    studio.assertSingleFilesCountMatchesHeader()
  })
})
