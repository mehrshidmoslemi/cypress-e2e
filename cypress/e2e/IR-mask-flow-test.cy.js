/**
 * IR mask flow test
 *
 * Test Suite  : Item Removal mask end-to-end flow
 * Coverage    : Upload → Mask → Login → Generate → Assert → Download → Feedback → Bookmark → Regenerate
 */

const SEL = {
  irCard: '#v5-home-tool-item-removal-card',
  fileInput: 'input[type="file"]',
  brushSize: 'div.bg-dark.rounded-full',
  removeBtn: '#v5-service-item-removal-remove-button',
  doneBtn: '#v5-service-item-removal-done-button',
  generateBtn: '#v5-service-item-removal-generate-button',
  loginWithEmailBtn: '#login-with-email-button',
  usernameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  loginSubmitBtn: '#loginwithemail-login-button',
  resultThumbnail: 'div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden',
  downloadBtn: '#v5-resultpage-primary-download-button',
  normalDownloadBtn: '#v5-resultpage-downloadmodule-downloadbutton-sec',
  thumbUpBtn: 'span.i-tabler\\:thumb-up',
  moodBtn: 'span.i-tabler\\:mood-empty-filled',
  feedbackDescription: 'textarea[placeholder="Description"]',
  feedbackSubmitBtn: 'button.bg-primary-main',
  bookmarkBtn: '#v5-resultpage-bookmark',
}

const TEST_IMAGE = 'cypress/fixtures/images/IR-test.jpg'

const ONBOARDING_ROLE_OTHER = 'Other'
const ONBOARDING_ROLE_TESTING = 'Just testing AIHomeDesign'
const ONBOARDING_MODAL_TITLE = 'Which best describes you?'
const ONBOARDING_STEP2_TITLE = 'What are you trying to do today?'
const ONBOARDING_EXPLORE_ON_OWN = "I'll explore on my own"

const isResultReady = ($body, includeGenerating = false) => {
  const hasDownload = $body.find(SEL.downloadBtn).length > 0
  const hasGeneratedSection =
    $body.text().includes('Generated Images') && $body.find(SEL.resultThumbnail).length > 0

  const ready = hasDownload || hasGeneratedSection

  return includeGenerating ? ready || isGenerating($body) : ready
}

const isGenerating = ($body) => {
  const removeLabel = $body.find(SEL.removeBtn).text()
  const generateLabel = $body.find(SEL.generateBtn).text()
  return removeLabel.includes('Generating') || generateLabel.includes('Generating')
}

const drawMaskOnCanvas = () => {
  cy.contains('Brush').should('be.visible')
  cy.get('canvas:visible').first().should('be.visible').then(($canvas) => {
    const width = $canvas.width()
    const height = $canvas.height()
    const startX = Math.round(width * 0.3)
    const startY = Math.round(height * 0.3)
    const endX = Math.round(width * 0.7)
    const endY = Math.round(height * 0.7)
    const steps = 12

    cy.wrap($canvas).realMouseDown({ x: startX, y: startY })
    for (let i = 1; i <= steps; i += 1) {
      const x = startX + ((endX - startX) * i) / steps
      const y = startY + ((endY - startY) * i) / steps
      cy.wrap($canvas).realMouseMove(x, y)
    }
    cy.wrap($canvas).realMouseUp({ x: endX, y: endY })
  })
}

const captureBeforeImageSrc = () => {
  cy.get('body').then(($body) => {
    if ($body.text().includes('Input Photo')) {
      cy.contains('Input Photo')
        .closest('div')
        .find('img[src]')
        .first()
        .invoke('attr', 'src')
        .as('beforeImageSrc')
      return
    }

    cy.get('img[src*="http"]:visible')
      .first()
      .invoke('attr', 'src')
      .as('beforeImageSrc')
  })
}

const assertRemoveChangedImage = () => {
  cy.get(SEL.downloadBtn, { timeout: 240000 }).should('be.visible')

  cy.get('@beforeImageSrc').then((beforeSrc) => {
    expect(beforeSrc, 'before image src should be captured').to.be.a('string').and.not.be.empty

    cy.get('img[src*="http"]:visible').then(($imgs) => {
      const afterSrcs = [
        ...new Set(
          [...$imgs]
            .map((img) => img.getAttribute('src'))
            .filter((src) => src && src !== beforeSrc),
        ),
      ]

      expect(
        afterSrcs.length,
        'generated image must have a different source than the input (remove applied)',
      ).to.be.greaterThan(0)
    })
  })
}

const clickResultThumbnail = () => {
  cy.get('body').then(($body) => {
    if ($body.find(SEL.downloadBtn).length) {
      return
    }

    if ($body.text().includes('Generated Images')) {
      cy.contains('Generated Images')
        .closest('div')
        .find(SEL.resultThumbnail)
        .first()
        .click({ force: true })
      return
    }

    if ($body.find(SEL.resultThumbnail).length) {
      cy.get(SEL.resultThumbnail).last().click({ force: true })
    }
  })
}

const retryRequestFailed = () => {
  cy.get('body').then(($body) => {
    if (!$body.text().includes('Request Failed')) {
      return
    }

    cy.contains('button', 'Try Again').click({ force: true })
    dismissBlockingModals()
    cy.wait(5000)

    cy.get('body').then(($after) => {
      if ($after.find(SEL.doneBtn).length && !isResultReady($after)) {
        cy.get(SEL.doneBtn).click({ force: true })
      }
    })
  })
}

const waitForGenerationResult = (attemptsLeft = 16) => {
  cy.get('body').then(($body) => {
    if ($body.find(SEL.downloadBtn).length > 0 || $body.text().includes('Generated Images')) {
      return
    }

    if ($body.text().includes('Request Failed')) {
      retryRequestFailed()
      cy.wait(10000)
      waitForGenerationResult(attemptsLeft - 1)
      return
    }

    if ($body.find(SEL.doneBtn).length && !isGenerating($body)) {
      dismissBlockingModals()
      cy.get(SEL.doneBtn).click({ force: true })
    }

    if (attemptsLeft <= 0) {
      expect(
        $body.find(SEL.downloadBtn).length,
        'generation should complete with a visible result',
      ).to.be.greaterThan(0)
      return
    }

    cy.wait(20000)
    waitForGenerationResult(attemptsLeft - 1)
  })
}

const openResultView = () => {
  waitForGenerationResult()
  clickResultThumbnail()
  cy.get(SEL.downloadBtn, { timeout: 120000 }).should('be.visible')
}

const proceedAfterLogin = () => {
  dismissBlockingModals()

  cy.get('body', { timeout: 60000 }).then(($body) => {
    if ($body.find(SEL.downloadBtn).length > 0 || isGenerating($body)) {
      return
    }

    cy.get(SEL.doneBtn, { timeout: 60000 }).scrollIntoView().click({ force: true })
  })
}

const enablePointerEvents = () => {
  cy.window().then((win) => {
    win.document.querySelectorAll('.pointer-events-none').forEach((el) => {
      el.style.setProperty('pointer-events', 'auto', 'important')
    })
  })
}

const dismissOnboardingModal = () => {
  cy.get('body').then(($body) => {
    const titleEl = [...$body[0].querySelectorAll('*')].find((el) => {
      const text = el.textContent?.trim() || ''
      return text === ONBOARDING_MODAL_TITLE && Cypress.dom.isVisible(el)
    })

    if (!titleEl) {
      cy.log('Onboarding modal not shown — skipping')
      return
    }

    completeOnboarding()
  })
}

const dismissCookieConsent = () => {
  cy.get('body').then(($body) => {
    if ($body.text().includes('We use cookies')) {
      cy.contains('button', 'Accept all').click({ force: true })
      cy.contains('We use cookies', { timeout: 10000 }).should('not.exist')
    }
  })
}

const dismissBlockingModals = () => {
  dismissOnboardingModal()
  dismissCookieConsent()
}

const clickGenerate = () => {
  dismissBlockingModals()
  cy.get('body').click(0, 0, { force: true })
  cy.get(SEL.generateBtn).scrollIntoView().should('be.visible').click({ force: true })
}

const loginWithEmail = () => {
  dismissBlockingModals()

  cy.get('body', { timeout: 30000 }).should(($body) => {
    const hasLoginPrompt =
      $body.text().includes('Welcome Back') ||
      $body.find(SEL.loginWithEmailBtn).length > 0 ||
      $body.find(SEL.usernameInput).length > 0
    expect(hasLoginPrompt, 'login prompt should be visible after remove').to.be.true
  })

  cy.get('body').then(($body) => {
    if ($body.find(SEL.usernameInput).length === 0) {
      cy.contains('button', 'Log in with Email').click({ force: true })
    }
  })

  cy.get(SEL.usernameInput, { timeout: 30000 })
    .should('be.visible')
    .clear()
    .type('memoslemi.sdstudio+1011@gmail.com', { force: true })
  cy.get(SEL.passwordInput).clear().type('12345678', { force: true })
  cy.get(SEL.loginSubmitBtn).click({ force: true })

  cy.contains('Welcome Back', { timeout: 60000 }).should('not.exist')
  cy.wait(5000)
}

const submitMaskForGeneration = () => {
  dismissBlockingModals()
  cy.get(SEL.doneBtn, { timeout: 60000 }).scrollIntoView().should('be.visible').click({ force: true })

  cy.get('body', { timeout: 120000 }).then(($body) => {
    if (isResultReady($body, true)) {
      return
    }

    dismissBlockingModals()
    cy.get(SEL.doneBtn).click({ force: true })
  })
}

const openIRSidebar = () => {
  cy.get('body').then(($body) => {
    if ($body.text().includes('Item Removal Mask')) {
      cy.contains('Item Removal Mask').click({ force: true })
      return
    }

    cy.contains('span.text-body-md.text-darkest', 'AI Item Removal')
      .closest('div.cursor-pointer.items-center.justify-between')
      .should('be.visible')
      .click({ force: true })
  })
}

const completeOnboarding = () => {
  cy.contains(ONBOARDING_MODAL_TITLE, { timeout: 15000 }).should('be.visible')
  cy.contains(ONBOARDING_ROLE_OTHER).should('be.visible').click()
  cy.contains(ONBOARDING_STEP2_TITLE, { timeout: 15000 }).should('be.visible')
  cy.contains(ONBOARDING_ROLE_TESTING, { timeout: 15000 }).should('be.visible').click()
  cy.contains(ONBOARDING_EXPLORE_ON_OWN, { timeout: 15000 }).should('be.visible').click()
}

describe('IR-mask-flow-test', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

  it('completes IR flow', () => {
    // ── 1. Visit site ─────────────────────────────────────────────────────────
    cy.visit('https://app.aihomedesign.com/')
    cy.wait(3000)
    dismissBlockingModals()

    // ── 2. Open IR uploader ───────────────────────────────────────────────────
    dismissBlockingModals()
    cy.get(SEL.irCard).click({ force: true })
    cy.get(SEL.fileInput).selectFile(TEST_IMAGE, { force: true })
    cy.wait(7000)

    // ── 2. Mask setup & draw ──────────────────────────────────────────────────
    dismissBlockingModals()
    enablePointerEvents()
    cy.contains('Select Area', { timeout: 10000 }).should('be.visible').click({ force: true })
    cy.get(SEL.brushSize).filter('[style*="width: 32px"]').click({ force: true })
    drawMaskOnCanvas()
    dismissBlockingModals()
    cy.get(SEL.removeBtn).click({ force: true })

    // ── 3. Login ──────────────────────────────────────────────────────────────
    loginWithEmail()

    // ── 4. Submit mask & wait for result ──────────────────────────────────────
    cy.url().as('orderUrl')
    captureBeforeImageSrc()
    proceedAfterLogin()

    openResultView()
    assertRemoveChangedImage()

    // ── 5. Download ───────────────────────────────────────────────────────────
    cy.get(SEL.downloadBtn).click({ force: true })
    cy.get(SEL.normalDownloadBtn).click({ force: true })
    cy.wait(10000)

    // ── 6. Feedback & bookmark ──────────────────────────────────────────────────
    cy.get('body').type('{esc}')
    cy.wait(2000)
    dismissBlockingModals()
    cy.get(SEL.thumbUpBtn).closest('button').click({ force: true })
    cy.get(SEL.moodBtn).closest('button').click({ force: true })
    cy.get(SEL.feedbackDescription).type('The image is clear and the colors are accurate.')
    cy.get(SEL.feedbackSubmitBtn).contains('Submit').click({ force: true })
    cy.get(SEL.bookmarkBtn).click({ force: true })

    // ── 7. Regenerate from result page ────────────────────────────────────────
    dismissBlockingModals()
    openIRSidebar()
    cy.get('body').then(($body) => {
      if ($body.find(SEL.generateBtn).length) {
        clickGenerate()
      } else if ($body.find(SEL.removeBtn).length) {
        cy.get(SEL.removeBtn).click({ force: true })
      }
    })
    cy.wait(30000)
  })
})
