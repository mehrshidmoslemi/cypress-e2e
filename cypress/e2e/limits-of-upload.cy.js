/**
 * Bulk upload limits + Studio Single Files uploader
 *
 * Plan limits (tool bulk uploader):
 *   Free / Restricted : max 5 images per bulk upload
 *   Paid              : max 25 images per bulk upload
 *   Guest             : must log in; limit enforced after authentication
 *
 * Studio uploader (Studio → Single Files → Upload new photo):
 *   Separate component from tool bulk uploader; single-file replace flow.
 *
 * Fixtures: cypress/fixtures/bulk-upload-images.json
 * Images   : cypress/fixtures/images/image-resize-0.jpg … image-resize-0 - Copy (24).jpg
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  vsHomeCard: '#v5-home-tool-virtual-staging-card',
  studioProjectsLink: 'nav a[href="/studio/projects"]',
  fileInput: 'input[type="file"]',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'bulk-upload-limits',
})

const ACCOUNTS = {
  free: {
    email: 'memoslemi.sdstudio+1009@gmail.com',
    password: 'mmmmmmmm',
    maxFiles: 5,
  },
  paid: {
    email: 'memoslemi.sdstudio+10000@gmail.com',
    password: '12345678',
    maxFiles: 25,
  },
  restricted: {
    email: 'memoslemi.sdstudio+142@gmail.com',
    password: 'mmmmmmmm',
    maxFiles: 5,
  },
}

const BULK_UPLOAD_TIMEOUT = 180000
const STUDIO_UPLOAD_TIMEOUT = 120000
const LIMIT_TOAST_TIMEOUT = 15000

const limitErrorMessage = (maxFiles) =>
  `You can upload up to ${maxFiles} files at a time on your current plan.`

let bulkImagePaths = []

const buildDiskPaths = (count) => {
  if (count <= bulkImagePaths.length) {
    return bulkImagePaths.slice(0, count)
  }
  return [...bulkImagePaths, bulkImagePaths[0]]
}

const visitHomePrepared = () => {
  cy.visit('/')
  flow.prepareSiteForTesting()
}

const LOGIN_INVALID_MESSAGE = /email or password is invalid/i

const loginWithEmail = (email, password) => {
  cy.contains(SEL.loginSpan, 'Login', { timeout: 60000 }).click({ force: true })
  cy.contains(SEL.loginProfileBtn, 'Login', { timeout: 30000 }).click({ force: true })
  cy.get(SEL.loginWithEmailBtn).click({ force: true })
  cy.get(SEL.usernameInput).clear().type(email)
  cy.get(SEL.passwordInput).clear().type(password, { log: false })
  cy.get(SEL.loginSubmitBtn).click({ force: true })
  cy.get('body', { timeout: 20000 }).should(($body) => {
    expect($body.text(), 'credentials should be accepted').to.not.match(LOGIN_INVALID_MESSAGE)
  })
  cy.get(SEL.profileMenuTrigger, { timeout: 90000 }).should('be.visible')
  cy.get('nav').contains(/^Login$/).should('not.exist')
}

const loginAs = (account) => {
  cy.clearCookies()
  visitHomePrepared()
  loginWithEmail(account.email, account.password)
  flow.prepareSiteForTesting()
}

const openBulkUploader = () => {
  cy.get(SEL.vsHomeCard).scrollIntoView().click({ force: true })
  cy.contains(/drop or add several photos/i, { timeout: 30000 }).should('be.visible')
  cy.get(SEL.fileInput, { timeout: 30000 }).should('exist')
}

const uploadBulkImages = (count) => {
  cy.log(`Selecting ${count} image(s) for bulk upload`)
  cy.get(SEL.fileInput).first().selectFile(buildDiskPaths(count), { force: true })
}

const assertBulkLimitError = (maxFiles) => {
  cy.contains(limitErrorMessage(maxFiles), { timeout: LIMIT_TOAST_TIMEOUT }).should('be.visible')
}

const assertNoBulkLimitError = () => {
  cy.get('body', { timeout: 10000 }).should(($body) => {
    expect($body.text()).to.not.match(/you can upload up to \d+ files at a time on your current plan/i)
  })
}

const assertBulkUploadAccepted = () => {
  assertNoBulkLimitError()

  cy.get('body', { timeout: BULK_UPLOAD_TIMEOUT }).should(($body) => {
    const text = $body.text()
    const uploadStarted =
      text.includes('Upload Assets') ||
      /uploading/i.test(text) ||
      text.includes('Applying Magic') ||
      text.includes('Add Your Photos')

    expect(uploadStarted, 'bulk upload should start without limit error').to.be.true
  })
}

const loginFromBulkUploadModal = (email, password) => {
  cy.contains('Welcome Back', { timeout: 30000 }).should('be.visible')
  cy.get(SEL.loginWithEmailBtn).click({ force: true })
  cy.get(SEL.usernameInput).clear().type(email)
  cy.get(SEL.passwordInput).clear().type(password, { log: false })
  cy.get(SEL.loginSubmitBtn).click({ force: true })
}

const openStudioProjects = () => {
  cy.get(SEL.studioProjectsLink, { timeout: 30000 }).click({ force: true })
  cy.url({ timeout: 30000 }).should('include', '/studio/projects')
  flow.prepareSiteForTesting()
}

const singleFilesGrid = () => cy.contains('Single Files').parent('section').next('div')

const openFirstSingleFilePhoto = () => {
  cy.contains('Single Files', { timeout: 30000 }).scrollIntoView().should('be.visible')

  singleFilesGrid()
    .find('[aria-busy="true"]', { timeout: 60000 })
    .should('not.exist')

  flow.prepareSiteForTesting()

  singleFilesGrid()
    .contains('#v5-studio-single-file-images', /[1-9]\d* results/)
    .should('exist', { timeout: 60000 })
    .first()
    .scrollIntoView()
    .click({ force: true })

  cy.contains(/upload new photo/i, { timeout: 30000 }).should('be.visible')
}

const uploadNewPhotoInStudio = (fixturePath) => {
  cy.contains(/upload new photo/i).click({ force: true })
  cy.get('input[type="file"]', { timeout: 15000 }).should('exist')
  cy.get('input[type="file"]').last().selectFile(fixturePath, { force: true })
}

const assertStudioUploadSucceeded = () => {
  cy.get('body', { timeout: STUDIO_UPLOAD_TIMEOUT }).should(($body) => {
    const text = $body.text()
    const stillUploading = /uploading/i.test(text)
    const hasError = /unsuccessful upload|upload failed|could not upload/i.test(text)

    expect(stillUploading, 'studio upload should finish').to.be.false
    expect(hasError, 'studio upload should not show an error').to.be.false
    expect(
      text.includes('Your edit is ready') ||
        text.includes('Origin Photo') ||
        text.includes('On Selected Photo'),
      'studio photo detail should appear after upload',
    ).to.be.true
  })
}

const runStudioSingleFileUpload = (account, fixturePath) => {
  loginAs(account)
  openStudioProjects()
  openFirstSingleFilePhoto()
  uploadNewPhotoInStudio(fixturePath)
  assertStudioUploadSucceeded()
}

describe('Bulk upload limits', () => {
  before(() => {
    cy.fixture('bulk-upload-images').then(({ images }) => {
      bulkImagePaths = images.map(({ fixture }) => `cypress/fixtures/${fixture}`)
      expect(bulkImagePaths.length, 'fixture catalog should list 25 images').to.equal(25)
    })
  })

  describe('Free account (max 5)', () => {
    beforeEach(() => {
      loginAs(ACCOUNTS.free)
    })

    it('rejects 6 images with the plan limit error', () => {
      openBulkUploader()
      uploadBulkImages(6)
      assertBulkLimitError(ACCOUNTS.free.maxFiles)
    })

    it('accepts exactly 5 images without a limit error', () => {
      openBulkUploader()
      uploadBulkImages(5)
      assertBulkUploadAccepted()
    })
  })

  describe('Paid account (max 25)', () => {
    beforeEach(() => {
      loginAs(ACCOUNTS.paid)
    })

    it('rejects 26 images with the plan limit error', () => {
      openBulkUploader()
      uploadBulkImages(26)
      assertBulkLimitError(ACCOUNTS.paid.maxFiles)
    })

    it('accepts exactly 25 images without a limit error', () => {
      openBulkUploader()
      uploadBulkImages(25)
      assertBulkUploadAccepted()
    })
  })

  describe('Restricted account (max 5)', () => {
    beforeEach(() => {
      loginAs(ACCOUNTS.restricted)
    })

    it('rejects 6 images with the plan limit error', () => {
      openBulkUploader()
      uploadBulkImages(6)
      assertBulkLimitError(ACCOUNTS.restricted.maxFiles)
    })

    it('accepts exactly 5 images without a limit error', () => {
      openBulkUploader()
      uploadBulkImages(5)
      assertBulkUploadAccepted()
    })
  })

  describe('Guest user', () => {
    beforeEach(() => {
      cy.clearCookies()
      visitHomePrepared()
    })

    it('shows limit error after login when bulk selection exceeds the allowed count', () => {
      openBulkUploader()
      uploadBulkImages(6)

      // Guest must authenticate before bulk upload proceeds; restricted shares the 5-file limit with free.
      loginFromBulkUploadModal(ACCOUNTS.restricted.email, ACCOUNTS.restricted.password)
      assertBulkLimitError(ACCOUNTS.restricted.maxFiles)
    })
  })
})

describe('Studio Single Files uploader', () => {
  it('uploads a new photo for Free account via Upload new photo', () => {
    runStudioSingleFileUpload(
      ACCOUNTS.free,
      'cypress/fixtures/images/image-resize-0 - Copy (2).jpg',
    )
  })

  it('uploads a new photo for Paid account via Upload new photo', () => {
    runStudioSingleFileUpload(
      ACCOUNTS.paid,
      'cypress/fixtures/images/image-resize-0.jpg',
    )
  })

  it('uploads a new photo for Restricted account via Upload new photo', () => {
    runStudioSingleFileUpload(
      ACCOUNTS.restricted,
      'cypress/fixtures/images/image-resize-0 - Copy.jpg',
    )
  })
})
