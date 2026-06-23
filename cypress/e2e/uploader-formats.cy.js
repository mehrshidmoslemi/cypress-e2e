/**
 * Uploader format validation
 *
 * Verifies the shared uploader component accepts supported image formats,
 * rejects invalid files, and allows cancelling an in-progress upload.
 *
 * Fixtures: cypress/fixtures/images/
 */

const { COMMON_SEL, createEnhancedFlowHelpers, UPLOAD_TIMEOUT } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  homeCard: '#v5-home-tool-virtual-staging-card',
  fileInput: 'input[type="file"]',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'uploader-format-test',
})

// ── Supported formats (must upload successfully) ─────────────────────────────
const SUPPORTED_FILES = [
  { fixture: 'images/ARW-test.ARW', fileName: 'ARW-test.ARW' },
  { fixture: 'images/HEIC-test.HEIC', fileName: 'HEIC-test.HEIC' },
  { fixture: 'images/HEIF-test.heif', fileName: 'HEIF-test.heif' },
  { fixture: 'images/png-test.png', fileName: 'png-test.png' },
  { fixture: 'images/tif-test.tif', fileName: 'tif-test.tif' },
  { fixture: 'images/webp-test.webp', fileName: 'webp-test.webp' },
]

// ── Unsupported formats (must show error and not complete upload) ──────────────
const UNSUPPORTED_FILES = [
  { fixture: 'images/corrupted-test.jpg', fileName: 'corrupted-test.jpg' },
  { fixture: 'images/invalid-format-test.mp4', fileName: 'invalid-format-test.mp4' },
  { fixture: 'images/ratio-test.png', fileName: 'ratio-test.png' },
  { fixture: 'images/volume-test.jpg', fileName: 'volume-test.jpg' },
]

const MIME_BY_EXTENSION = {
  arw: 'image/x-sony-arw',
  heic: 'image/heic',
  heif: 'image/heif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  mp4: 'video/mp4',
  png: 'image/png',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',
}

const UPLOAD_ERROR_PATTERNS = [
  /unsuccessful upload/i,
  /unsupported/i,
  /not supported/i,
  /invalid/i,
  /file type/i,
  /corrupt/i,
  /ratio/i,
  /aspect/i,
  /dimension/i,
  /too large/i,
  /size/i,
  /volume/i,
  /upload failed/i,
  /could not upload/i,
  /unable to upload/i,
]

const SUPPORTED_UPLOAD_TIMEOUT = 120000
const LARGE_FILE_UPLOAD_TIMEOUT = 240000

const getUploadTimeout = (fixturePath) =>
  DISK_UPLOAD_FIXTURES.has(fixturePath) ? LARGE_FILE_UPLOAD_TIMEOUT : SUPPORTED_UPLOAD_TIMEOUT

const getMimeType = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase()
  return MIME_BY_EXTENSION[extension] || 'application/octet-stream'
}

const openUploader = () => {
  flow.dismissBlockingModals()
  cy.get(SEL.homeCard).scrollIntoView().click({ force: true })
  cy.get(SEL.fileInput, { timeout: 30000 }).should('exist')
}

// Large binaries are uploaded from disk; smaller files use cy.fixture bytes.
const DISK_UPLOAD_FIXTURES = new Set([
  'images/ARW-test.ARW',
  'images/volume-test.jpg',
])

const uploadFixture = (fixturePath, fileName) => {
  const filePath = `cypress/fixtures/${fixturePath}`

  if (DISK_UPLOAD_FIXTURES.has(fixturePath)) {
    return cy.readFile(filePath, null, { timeout: 60000 }).then(() => {
      cy.log(`Uploading large fixture from disk: ${fixturePath}`)
      cy.get(SEL.fileInput).selectFile(filePath, { force: true })
    })
  }

  return cy.fixture(fixturePath, null, { timeout: 60000 }).then((contents) => {
    cy.log(`Uploading fixture: ${fixturePath}`)
    cy.get(SEL.fileInput).selectFile(
      {
        contents: Cypress.Buffer.from(contents),
        fileName,
        mimeType: getMimeType(fileName),
      },
      { force: true },
    )
  })
}

const hasVisibleRemoveButton = ($body) =>
  [...$body.find('button')].some(
    (button) => button.textContent.trim() === 'Remove' && Cypress.dom.isVisible(button),
  )

const hasUploadPrompt = ($body) => {
  const text = $body.text().toLowerCase()
  return (
    text.includes('upload') ||
    text.includes('drop') ||
    text.includes('browse') ||
    text.includes('try again') ||
    text.includes('drag')
  )
}

const hasImagePreview = ($body) =>
  $body.find('img[src*="blob:"]').length > 0 ||
  $body.find('img[src*="data:image"]').length > 0 ||
  $body.find('img[src*="http"]').filter(':visible').length > 0 ||
  $body.find('canvas').filter(':visible').length > 0

const resetUploaderForNextFile = () => {
  flow.dismissBlockingModals()

  cy.get('body').then(($body) => {
    if ($body.text().includes('Try Again')) {
      cy.contains('button', 'Try Again').click({ force: true })
      return
    }

    if ($body.find(SEL.fileInput).length === 0) {
      cy.visit('/')
      openUploader()
    }
  })

  cy.get(SEL.fileInput, { timeout: 30000 }).should('exist')
}

const assertUploadSucceeded = (fileName, timeout = SUPPORTED_UPLOAD_TIMEOUT) => {
  cy.log(`Waiting for successful upload: ${fileName}`)

  cy.get('body', { timeout }).should(($body) => {
    const text = $body.text().toLowerCase()
    const isUploading = text.includes('uploading') || text.includes('upload in progress')

    expect(isUploading, `${fileName} should finish uploading`).to.be.false
    expect(hasImagePreview($body), `${fileName} should show an image preview`).to.be.true
    expect(hasVisibleRemoveButton($body), `${fileName} should show Remove button`).to.be.true
  })
}

const clickRemoveUploadedImage = () => {
  cy.contains('button', 'Remove', { timeout: 15000 }).should('be.visible').click({ force: true })
}

const assertUploadCleared = () => {
  cy.get('body', { timeout: 15000 }).should(($body) => {
    expect(hasVisibleRemoveButton($body), 'Remove button should disappear after clear').to.be.false
  })
  cy.get(SEL.fileInput, { timeout: 15000 }).should('exist')
}

const assertUploadErrorShown = (fileName) => {
  cy.get('body', { timeout: 30000 }).should(($body) => {
    const bodyText = $body.text()
    const hasSnackbar = $body.find(SEL.snackbar).length > 0
    const hasAlert = $body.find('[role="alert"]').length > 0
    const hasErrorText = UPLOAD_ERROR_PATTERNS.some((pattern) => pattern.test(bodyText))

    expect(
      hasSnackbar || hasAlert || hasErrorText,
      `${fileName} should display an upload error`,
    ).to.be.true
  })
}

const assertUploadDidNotComplete = (fileName) => {
  cy.get('body', { timeout: UPLOAD_TIMEOUT }).should(($body) => {
    const uploadText = $body.text().toLowerCase()
    const stillUploading =
      uploadText.includes('uploading') || uploadText.includes('upload in progress')

    expect(stillUploading, `${fileName} should not remain in uploading state`).to.be.false
    expect(hasVisibleRemoveButton($body), `${fileName} should not leave a removable preview`).to.be.false
  })
}

const delayUploadRequests = () => {
  cy.intercept({ method: /POST|PUT/, url: /upload|presign|storage|asset|file|image/i }, (req) => {
    req.on('response', (res) => {
      res.setDelay(8000)
    })
  })
}

describe('Uploader format validation', () => {
  beforeEach(() => {
    cy.visit('/')
    openUploader()
  })

  it('uploads supported formats one by one and removes each before the next', () => {
    cy.wrap(SUPPORTED_FILES).each((file) => {
      cy.log(`── Supported format: ${file.fileName} ──`)
      resetUploaderForNextFile()
      uploadFixture(file.fixture, file.fileName)
      assertUploadSucceeded(file.fileName, getUploadTimeout(file.fixture))
      clickRemoveUploadedImage()
      assertUploadCleared()
    })
  })

  it('rejects unsupported formats with an error and does not complete upload', () => {
    cy.wrap(UNSUPPORTED_FILES).each((file) => {
      cy.log(`── Unsupported format: ${file.fileName} ──`)
      resetUploaderForNextFile()
      uploadFixture(file.fixture, file.fileName)
      assertUploadErrorShown(file.fileName)
      assertUploadDidNotComplete(file.fileName)
    })
  })

  it('cancels an in-progress upload when Cancel is clicked', () => {
    delayUploadRequests()

    uploadFixture('images/webp-test.webp', 'webp-test.webp')

    // Wait until the uploader enters an in-progress state, then cancel.
    cy.get('body', { timeout: 15000 }).should(($body) => {
      const text = $body.text().toLowerCase()
      const isUploading =
        text.includes('uploading') || text.includes('upload in progress')
      expect(isUploading, 'upload should be in progress before cancel').to.be.true
    })

    cy.contains('button', 'Cancel', { timeout: 10000 }).should('be.visible').click({ force: true })

    cy.get('body', { timeout: 15000 }).should(($body) => {
      const text = $body.text().toLowerCase()
      expect(text.includes('uploading'), 'uploading text should disappear after cancel').to.be.false
      expect(text.includes('upload in progress'), 'progress text should disappear after cancel').to.be.false
    })

    assertUploadCleared()
  })
})
