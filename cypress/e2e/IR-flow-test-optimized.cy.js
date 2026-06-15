/**
 * IR-flow-test (Optimized)
 *
 * Test Suite  : Item Removal (IR) end-to-end flow
 * Coverage    : Upload → Gen-1 → Login → Download (Normal + Upscale) → Feedback → Bookmark → Gen-2
 *
 * Helpers keep selectors DRY; flow and waits match the working IR-flow-test.cy.js.
 */

const SEL = {
  irCard: '#v5-home-tool-item-removal-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-service-item-removal-generate-button',
  loginWithEmailBtn: '#login-with-email-button',
  usernameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  loginSubmitBtn: '#loginwithemail-login-button',
  resultThumbnail: 'div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden',
  downloadBtn: '#v5-resultpage-primary-download-button',
  normalDownloadBtn: '#v5-resultpage-downloadmodule-downloadbutton-sec',
  upscaleDownloadBtn: '#v5-resultpage-downloadmodule-upscale-download',
  thumbUpBtn: 'span.i-tabler\\:thumb-up',
  moodBtn: 'span.i-tabler\\:mood-empty-filled',
  feedbackDescription: 'textarea[placeholder="Description"]',
  feedbackSubmitBtn: 'button.bg-primary-main',
  snackbar: '[role="alert"][data-state="open"]',
  bookmarkBtn: '#v5-resultpage-bookmark',
}

const ONBOARDING_ROLE_OTHER = 'Other'
const ONBOARDING_ROLE_TESTING = 'Just testing AIHomeDesign'
const ONBOARDING_MODAL_TITLE = 'Which best describes you?'
const ONBOARDING_STEP2_TITLE = 'What are you trying to do today?'
const ONBOARDING_EXPLORE_ON_OWN = "I'll explore on my own"

const loginAfterGenerate = () => {
  cy.get(SEL.loginWithEmailBtn, { timeout: 30000 }).should('be.visible').click()
  cy.get(SEL.usernameInput).should('be.visible').type('memoslemi.sdstudio+1011@gmail.com')
  cy.get(SEL.passwordInput).type('12345678')
  cy.get(SEL.loginSubmitBtn).click()
  cy.wait(30000)
}

const submitFeedback = () => {
  cy.get(SEL.thumbUpBtn).closest('button').click()
  cy.get(SEL.moodBtn).closest('button').click()
  cy.get(SEL.feedbackDescription).type('The image is clear and the colors are accurate.')
  cy.get(SEL.feedbackSubmitBtn).contains('Submit').click()
}

const verifyFeedbackAndWaitClose = () => {
  cy.contains(SEL.snackbar, 'Feedback submitted successfully.', { timeout: 10000 }).should(
    'be.visible',
  )
  cy.get(SEL.snackbar).should('not.exist')
}

const bookmarkAndVerify = () => {
  cy.get(SEL.bookmarkBtn).click()
  cy.contains(SEL.snackbar, /bookmark/i, { timeout: 10000 }).should('be.visible')
  cy.get(SEL.snackbar).should('not.exist')
}

const openIRSidebar = () => {
  cy.contains('span.text-body-md.text-darkest', 'AI Item Removal')
    .closest('div.cursor-pointer.items-center.justify-between')
    .should('be.visible')
    .click()
}

const completeOnboarding = () => {
  cy.contains(ONBOARDING_MODAL_TITLE, { timeout: 15000 }).should('be.visible')
  cy.contains(ONBOARDING_ROLE_OTHER).should('be.visible').click()
  cy.contains(ONBOARDING_STEP2_TITLE, { timeout: 15000 }).should('be.visible')
  cy.contains(ONBOARDING_ROLE_TESTING, { timeout: 15000 }).should('be.visible').click()
  cy.contains(ONBOARDING_EXPLORE_ON_OWN, { timeout: 15000 }).should('be.visible').click()
}

const dismissCookieConsent = () => {
  cy.get('body').then(($body) => {
    if ($body.text().includes('We use cookies')) {
      cy.contains('button', 'Accept all').click({ force: true })
    }
  })
}

const clickGenerate = () => {
  dismissOnboardingModal()
  dismissCookieConsent()
  cy.get(SEL.generateBtn).scrollIntoView().should('be.visible').click({ force: true })
}

const dismissOnboardingModal = () => {
  cy.get('body').then(($body) => {
    if (!$body.text().includes(ONBOARDING_MODAL_TITLE)) {
      cy.log('Onboarding modal not shown — skipping')
      return
    }

    completeOnboarding()
  })
}

describe('IR-flow-test', () => {
  it('completes IR flow: upload → gen-1 → login → download (normal + upscale) → feedback → bookmark → gen-2', () => {
    // ── 1. Visit site ─────────────────────────────────────────────────────────
    cy.visit('https://app.aihomedesign.com/')

    // ── 1a. Dismiss onboarding modal (if shown) ───────────────────────────────
    dismissOnboardingModal()

    // ── 2. Open IR uploader ───────────────────────────────────────────────────
    cy.get(SEL.irCard).click()

    // ── 3. Upload image ───────────────────────────────────────────────────────
    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/IR-test.jpg', { force: true })
    cy.wait(7000)

    // ── 4. Gen-1 trigger + login ──────────────────────────────────────────────
    clickGenerate()
    loginAfterGenerate()

    // ── 5. Gen-1 result + download ──────────────────────────────────────────────
    cy.get(SEL.resultThumbnail).first().should('be.visible').click()

    // ── 5a. Download – Normal ───────────────────────────────────────────────────
    cy.get(SEL.downloadBtn).click()
    cy.get(SEL.normalDownloadBtn).click()
    cy.wait(10000)

    // ── 5b. Download – Upscale ────────────────────────────────────────────────
    cy.get(SEL.downloadBtn).click()
    cy.get(SEL.upscaleDownloadBtn).click()
    cy.get(SEL.normalDownloadBtn).click()
    cy.wait(25000)

    // ── 6. Feedback ───────────────────────────────────────────────────────────
    submitFeedback()
    verifyFeedbackAndWaitClose()

    // ── 7. Bookmark ─────────────────────────────────────────────────────────────
    bookmarkAndVerify()

    // ── 8. Gen-2: regenerate ────────────────────────────────────────────────────
    openIRSidebar()
    clickGenerate()
    cy.wait(30000)
  })
})
