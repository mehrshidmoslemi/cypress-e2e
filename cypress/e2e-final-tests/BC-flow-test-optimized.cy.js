/**
 * BC-flow-test (Optimized)
 *
 * Test Suite  : Backsplash Change (BC) end-to-end flow
 * Coverage    : Login → Upload → Gen-1 → Download (Normal + Upscale) → Feedback →
 *               Bookmark → Gen-2 (Kitchen + White Marble)
 *
 * Helpers keep selectors DRY; flow and waits match the working BC-flow-test.cy.js.
 * Fixes wrong generate button id from original (#v5-tool-floor-change-generate-button).
 */

const SEL = {
  loginSpan: 'span',
  loginProfileBtn: 'button',
  loginWithEmailBtn: '#login-with-email-button',
  usernameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  loginSubmitBtn: '#loginwithemail-login-button',
  bcHomeCard: '#v5-home-tool-backsplash-change',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-backsplash-change-generate-button',
  spaceKitchen: '#v5-tool-backsplash-change-space-kitchen',
  materialBlackMarble: '#v5-tool-backsplash-change-material-black-marble',
  materialWhiteMarble: '#v5-tool-backsplash-change-material-white-marble',
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
const MATERIAL_DROPDOWN_LABELS = [
  'Grey Marble',
  'Black Marble',
  'White Marble',
  'Modern',
  'Contemporary',
]
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

const clickSpaceDropdown = () => {
  dismissBlockingModals()
  cy.get('body').then(($body) => {
    const hasSelect = [...$body.find('button')].some(
      (button) => button.innerText.trim() === 'Select',
    )

    if (hasSelect) {
      cy.contains('button', 'Select')
        .find('span.i-tabler\\:chevron-down')
        .click({ force: true })
      return
    }

    cy.contains('Space')
      .parents()
      .find('button span.i-tabler\\:chevron-down')
      .first()
      .click({ force: true })
  })
}

const openMaterialDropdown = () => {
  dismissBlockingModals()
  cy.get('button').then(($buttons) => {
    const target = [...$buttons].find((button) =>
      MATERIAL_DROPDOWN_LABELS.some((label) => button.innerText.trim().includes(label)),
    )
    expect(target, 'material dropdown button').to.exist
    cy.wrap(target).click({ force: true })
  })
}

const selectSpace = (spaceId, waitMs = 1000) => {
  clickSpaceDropdown()
  cy.wait(waitMs)
  cy.get(spaceId).click({ force: true })
  closeOpenDropdown()
}

const selectMaterial = (materialId) => {
  openMaterialDropdown()
  cy.wait(800)
  cy.get(materialId).scrollIntoView().click({ force: true })
  closeOpenDropdown()
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

const openBCSidebar = () => {
  dismissBlockingModals()
  cy.contains('span.text-body-md.text-darkest', 'AI Backsplash Change')
    .closest('div.cursor-pointer.items-center.justify-between')
    .should('be.visible')
    .click({ force: true })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

describe('BC-flow-test', () => {
  it('completes BC flow: login → upload → gen-1 → download (normal + upscale) → feedback → bookmark → gen-2', () => {
    // ── 1. Visit site ─────────────────────────────────────────────────────────
    cy.visit('https://app.aihomedesign.com/')
    cy.wait(3000)
    dismissBlockingModals()

    // ── 2. Login via profile ────────────────────────────────────────────────────
    loginViaProfile()
    cy.wait(3000)

    // ── 3. Open Backsplash Change uploader ────────────────────────────────────
    dismissBlockingModals()
    cy.get(SEL.bcHomeCard).click({ force: true })

    // ── 4. Upload image ───────────────────────────────────────────────────────
    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/BC-test.jpg', { force: true })
    cy.wait(10000)

    // ── 5. Gen-1 config: Kitchen + Black Marble ─────────────────────────────────
    dismissBlockingModals()
    selectSpace(SEL.spaceKitchen, 1000)
    selectMaterial(SEL.materialBlackMarble)

    // ── 6. Gen-1 trigger + result ───────────────────────────────────────────────
    clickGenerate()
    waitForGen1Results()

    // ── 7. Gen-1 download ─────────────────────────────────────────────────────────
    // ── 7a. Download – Normal ───────────────────────────────────────────────────
    cy.get(SEL.downloadBtn, { timeout: 60000 }).should('be.visible').click({ force: true })
    cy.get(SEL.normalDownloadBtn).click({ force: true })
    cy.wait(10000)

    // ── 7b. Download – Upscale ────────────────────────────────────────────────
    cy.get(SEL.downloadBtn).click({ force: true })
    cy.get(SEL.upscaleDownloadBtn).click({ force: true })
    cy.get(SEL.normalDownloadBtn).click({ force: true })
    cy.wait(25000)

    // ── 8. Feedback ───────────────────────────────────────────────────────────
    submitFeedback()
    verifyFeedbackAndWaitClose()

    // ── 9. Bookmark ─────────────────────────────────────────────────────────────
    bookmarkAndVerify()

    // ── 10. Gen-2: Kitchen + White Marble ───────────────────────────────────────
    openBCSidebar()
    selectSpace(SEL.spaceKitchen, 1000)
    selectMaterial(SEL.materialWhiteMarble)
    clickGenerate()
    cy.wait(30000)
  })
})
