/**
 * IR mask flow test
 *
 * Test Suite  : Item Removal mask end-to-end flow
 * Coverage    : Upload → Mask → Login → Generate → Credit (−1) → Assert → Download → Feedback → Bookmark → Regenerate (no credit)
 */

const { COMMON_SEL, createEnhancedFlowHelpers, TEST_EMAIL, TEST_PASSWORD } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
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
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'ir-mask-flow-user',
})

const TEST_IMAGE = 'cypress/fixtures/images/IR-test.jpg'

const ONBOARDING_ROLE_OTHER = 'Other'
const ONBOARDING_ROLE_TESTING = 'Just testing AIHomeDesign'
const ONBOARDING_MODAL_TITLE = 'Which best describes you?'
const ONBOARDING_STEP2_TITLE = 'What are you trying to do today?'
const ONBOARDING_EXPLORE_ON_OWN = "I'll explore on my own"

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

const regenerateMask = () => {
  dismissBlockingModals()
  cy.get('body').type('{esc}')
  cy.wait(1000)

  flow.readCreditBalance().then((beforeRegenCredits) => {
    cy.log(`Credit before regenerate: ${beforeRegenCredits}`)

    cy.get('body').then(($body) => {
      const hasGenerate = [...$body.find('button')].some(
        (btn) => btn.textContent.trim() === 'Generate' && Cypress.dom.isVisible(btn),
      )
      if (!hasGenerate) {
        cy.contains('.text-body-md', 'Item Removal Mask').click({ force: true })
      }
    })

    cy.contains('button', 'Generate', { timeout: 60000 }).should('be.visible').click({ force: true })
    flow.waitForAllResultsReady({ isRegenerate: true })
    flow.assertCreditAfterAction(
      beforeRegenCredits,
      0,
      'regenerate should NOT deduct any credits',
    )
  })
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
    .type(TEST_EMAIL, { force: true })
  cy.get(SEL.passwordInput).clear().type(TEST_PASSWORD, { force: true })
  cy.get(SEL.loginSubmitBtn).click({ force: true })

  cy.contains('Welcome Back', { timeout: 60000 }).should('not.exist')
  cy.wait(5000)
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
      if (err.message.includes('An unknown error has occurred')) {
        return false
      }
    })
  })

  it('completes IR flow', () => {
    // ── 1. Visit site ─────────────────────────────────────────────────────────
    cy.clearCookies()
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
    flow.watchCreditApi('creditApi')
    loginWithEmail()
    dismissBlockingModals()
    cy.wait('@creditApi', { timeout: 90000 }).then(({ response }) => {
      const creditsAfterLogin = response.body.balance
      cy.log(`Credit after login: ${creditsAfterLogin}`)

      dismissBlockingModals()
      cy.get('canvas:visible', { timeout: 60000 }).first().should('be.visible')

      // ── 4. Submit mask & wait for result ──────────────────────────────────────
      cy.url().as('orderUrl')
      captureBeforeImageSrc()
      cy.get(SEL.doneBtn).scrollIntoView().click({ force: true })
      flow.waitForAllResultsReady({ skipGenerateRetry: true })
      assertRemoveChangedImage()

      flow.assertCreditAfterAction(
        creditsAfterLogin,
        -1,
        'first generate should deduct 1 credit',
      ).then(() => {
        // ── 5. Download & feedback ────────────────────────────────────────────────
        cy.get(SEL.downloadBtn).click({ force: true })
        cy.get(SEL.normalDownloadBtn).click({ force: true })
        cy.wait(10000)

        cy.get('body').type('{esc}')
        cy.wait(2000)
        dismissBlockingModals()
        cy.get(SEL.thumbUpBtn).closest('button').click({ force: true })
        cy.get(SEL.moodBtn).closest('button').click({ force: true })
        cy.get(SEL.feedbackDescription).type('The image is clear and the colors are accurate.')
        cy.get(SEL.feedbackSubmitBtn).contains('Submit').click({ force: true })

        // ── 6. Regenerate (should not deduct credits) ─────────────────────────────
        regenerateMask()

        // ── 7. Bookmark ───────────────────────────────────────────────────────────
        cy.get(SEL.bookmarkBtn).click({ force: true })
      })
    })
  })
})
