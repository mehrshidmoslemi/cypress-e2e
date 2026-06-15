/**
 * D2D-flow-test (Optimized)
 *
 * Test Suite  : Day to Dusk (D2D) end-to-end flow
 * Coverage    : Login → Upload → Gen-1 → Download → Feedback → Bookmark → Gen-2
 *
 * Helpers keep selectors DRY; flow and waits match the working D2D-flow-test.cy.js.
 */

const SEL = {
  loginSpan: 'span',
  loginProfileBtn: 'button',
  loginWithEmailBtn: '#login-with-email-button',
  usernameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  loginSubmitBtn: '#loginwithemail-login-button',
  d2dCard: '#v5-home-tool-day-to-dusk-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-day-to-dusk-generate-button',
  resultThumbnail: 'div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden',
  downloadBtn: '#v5-resultpage-primary-download-button',
  normalDownloadBtn: '#v5-resultpage-downloadmodule-downloadbutton-sec',
  thumbUpBtn: 'span.i-tabler\\:thumb-up',
  moodBtn: 'span.i-tabler\\:mood-empty-filled',
  feedbackDescription: 'textarea[placeholder="Description"]',
  feedbackSubmitBtn: 'button.bg-primary-main',
  snackbar: '[role="alert"][data-state="open"]',
  bookmarkBtn: '#v5-resultpage-bookmark',
  skyStyleTwilight: '#v5-tool-day-to-dusk-sky-style-twilight-without-cloud',
}

const ONBOARDING_ROLE_OTHER = 'Other'
const ONBOARDING_ROLE_TESTING = 'Just testing AIHomeDesign'
const ONBOARDING_MODAL_TITLE = 'Which best describes you?'
const ONBOARDING_STEP2_TITLE = 'What are you trying to do today?'
const ONBOARDING_EXPLORE_ON_OWN = "I'll explore on my own"
const GEN_RESULT_TIMEOUT = 240000

const completeOnboarding = () => {
  cy.contains(ONBOARDING_MODAL_TITLE, { timeout: 15000 }).should('be.visible')
  cy.contains(ONBOARDING_ROLE_OTHER).should('be.visible').click()
  cy.contains(ONBOARDING_STEP2_TITLE, { timeout: 15000 }).should('be.visible')
  cy.contains(ONBOARDING_ROLE_TESTING, { timeout: 15000 }).should('be.visible').click()
  cy.contains(ONBOARDING_EXPLORE_ON_OWN, { timeout: 15000 }).should('be.visible').click()
}

const dismissOnboardingModal = () => {
  cy.get('body', { timeout: 15000 }).then(($body) => {
    if (!$body.text().includes(ONBOARDING_MODAL_TITLE)) {
      cy.log('Onboarding modal not shown — skipping')
      return
    }

    completeOnboarding()
  })

  cy.get('body').then(($body) => {
    if ($body.text().includes(ONBOARDING_MODAL_TITLE)) {
      cy.contains(ONBOARDING_MODAL_TITLE, { timeout: 10000 }).should('not.exist')
    }
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

const closeOpenDropdown = () => {
  cy.get('body').type('{esc}', { force: true })
  cy.get('body').click(0, 0, { force: true })
  cy.wait(500)
}

const loginViaProfile = () => {
  dismissBlockingModals()
  cy.contains(SEL.loginSpan, 'Login').should('be.visible').click()
  cy.contains(SEL.loginProfileBtn, 'Login').click()
  cy.get(SEL.loginWithEmailBtn).click()
  cy.get(SEL.usernameInput).type('memoslemi.sdstudio+1011@gmail.com')
  cy.get(SEL.passwordInput).type('12345678')
  cy.get(SEL.loginSubmitBtn).click()
}

const clickGenerate = () => {
  dismissBlockingModals()
  cy.get('body').click(0, 0, { force: true })
  cy.get(SEL.generateBtn).scrollIntoView().should('be.visible').click({ force: true })
}

const waitForGen1Results = () => {
  cy.url({ timeout: GEN_RESULT_TIMEOUT }).should('include', 'order_id=')

  cy.get('body', { timeout: GEN_RESULT_TIMEOUT }).should(($body) => {
    const hasDownload = $body.find(SEL.downloadBtn).length > 0
    const hasReadyThumb =
      $body.find(SEL.resultThumbnail).length > 0 && !$body.text().includes('Generating')
    expect(hasDownload || hasReadyThumb, 'generation should complete').to.be.true
  })

  cy.get('body').then(($body) => {
    if ($body.find(SEL.downloadBtn).length) {
      return
    }

    cy.get(SEL.resultThumbnail).first().click({ force: true })
  })

  cy.get(SEL.downloadBtn, { timeout: GEN_RESULT_TIMEOUT }).should('be.visible')
}

const submitFeedback = () => {
  cy.get(SEL.thumbUpBtn).closest('button').click({ force: true })
  cy.get(SEL.moodBtn).closest('button').click({ force: true })
  cy.get(SEL.feedbackDescription).type('The image is clear and the colors are accurate.')
  cy.get(SEL.feedbackSubmitBtn).contains('Submit').click({ force: true })
}

const verifyFeedbackAndWaitClose = () => {
  cy.contains(SEL.snackbar, 'Feedback submitted successfully.', { timeout: 10000 }).should(
    'be.visible',
  )
  cy.get(SEL.snackbar).should('not.exist')
}

const bookmarkAndVerify = () => {
  cy.get(SEL.bookmarkBtn).click({ force: true })
  cy.contains(SEL.snackbar, /bookmark/i, { timeout: 10000 }).should('be.visible')
  cy.get(SEL.snackbar).should('not.exist')
}

const openD2DSidebar = () => {
  dismissBlockingModals()
  cy.contains('span.text-body-md.text-darkest', 'AI Day to Dusk')
    .closest('div.cursor-pointer.items-center.justify-between')
    .should('be.visible')
    .click({ force: true })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

const selectSkyStyle = (skyStyleSelector) => {
  dismissBlockingModals()
  cy.contains('span.text-title-sm', 'Sky Style').click({ force: true })
  cy.get(skyStyleSelector).click({ force: true })
  closeOpenDropdown()
}

describe('D2Dow-test', () => {
  it('completes D2D flow', () => {
    // ── 1. Visit site ─────────────────────────────────────────────────────────
    cy.visit('https://app.aihomedesign.com/')
    cy.wait(3000)
    dismissBlockingModals()

    // ── 2. Login via profile ────────────────────────────────────────────────────
    loginViaProfile()
    cy.wait(3000)

    // ── 3. Open D2D uploader ──────────────────────────────────────────────────
    dismissBlockingModals()
    cy.get(SEL.d2dCard).click({ force: true })

    // ── 4. Upload image ───────────────────────────────────────────────────────
    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/D2D-test.png', { force: true })
    cy.wait(10000)

    // ── 5. Gen-1 trigger ──────────────────────────────────────────────────────
    dismissBlockingModals()
    clickGenerate()
    waitForGen1Results()

    // ── 6. Gen-1 download ───────────────────────────────────────────────────────
    cy.get(SEL.downloadBtn).click({ force: true })
    cy.get(SEL.normalDownloadBtn).click({ force: true })
    cy.wait(10000)

    // ── 7. Feedback ───────────────────────────────────────────────────────────
    submitFeedback()
    verifyFeedbackAndWaitClose()

    // ── 8. Bookmark ─────────────────────────────────────────────────────────────
    bookmarkAndVerify()

    // ── 9. Gen-2: Twilight sky style ────────────────────────────────────────────
    openD2DSidebar()
    selectSkyStyle(SEL.skyStyleTwilight)
    clickGenerate()
    cy.wait(30000)
  })
})
