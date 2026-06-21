/**
 * IE-flow-test (Optimized)
 *
 * Test Suite  : Image Enhancement (IE) end-to-end flow
 * Coverage    : Login → Upload → Gen-1 → Download → Feedback → Bookmark → Gen-2 (Outdoor)
 *
 * Helpers keep selectors DRY; flow and waits match the working IE-flow-test.cy.js.
 */

const SEL = {
  loginSpan: 'span',
  loginProfileBtn: 'button',
  loginWithEmailBtn: '#login-with-email-button',
  usernameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  loginSubmitBtn: '#loginwithemail-login-button',
  ieCard: '#v5-home-tool-image-enhancement-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-service-image-enhancement-generate-button',
  resultThumbnail: 'div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden',
  downloadBtn: '#v5-resultpage-primary-download-button',
  normalDownloadBtn: '#v5-resultpage-downloadmodule-downloadbutton-sec',
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
const GEN_RESULT_TIMEOUT = 240000

const completeOnboarding = () => {
  cy.contains(ONBOARDING_MODAL_TITLE, { timeout: 15000 }).should('be.visible')
  cy.contains(ONBOARDING_ROLE_OTHER).should('be.visible').click()
  cy.contains(ONBOARDING_STEP2_TITLE, { timeout: 15000 }).should('be.visible')
  cy.contains(ONBOARDING_ROLE_TESTING, { timeout: 15000 }).should('be.visible').click()
  cy.contains(ONBOARDING_EXPLORE_ON_OWN, { timeout: 15000 }).should('be.visible').click()
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

const waitForAppReady = () => {
  cy.get('body', { timeout: 60000 }).should(($body) => {
    expect($body.css('pointer-events'), 'body interactive after login').to.not.equal('none')
  })
}

const loginViaProfile = () => {
  dismissBlockingModals()
  cy.contains(SEL.loginSpan, 'Login').should('be.visible').click()
  dismissBlockingModals()
  cy.contains(SEL.loginProfileBtn, 'Login').click()
  cy.get(SEL.loginWithEmailBtn).click()
  dismissBlockingModals()
  cy.get(SEL.usernameInput).should('be.visible').type('memoslemi.sdstudio+1011@gmail.com')
  cy.get(SEL.passwordInput).type('12345678')
  cy.get(SEL.loginSubmitBtn).click({ force: true })
  cy.get(SEL.loginSubmitBtn, { timeout: 60000 }).should('not.exist')
  cy.contains('Welcome Back', { timeout: 60000 }).should('not.exist')
  waitForAppReady()
}

const clickGenerate = () => {
  dismissBlockingModals()
  cy.get('body').click(0, 0, { force: true })
  cy.get(SEL.generateBtn).scrollIntoView().should('be.visible').click({ force: true })
}

const waitForGen1Results = () => {
  cy.url({ timeout: GEN_RESULT_TIMEOUT }).should('include', 'order_id=')

  cy.wait(60000)
  cy.get('body').then(($body) => {
    const hasThumbnail = $body.find(SEL.resultThumbnail).length > 0
    const hasDownloadButton = $body.find(SEL.downloadBtn).length > 0
    if (!hasThumbnail && !hasDownloadButton) {
      clickGenerate()
    }
  })

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

const openIESidebar = () => {
  dismissBlockingModals()
  cy.get('body').then(($body) => {
    const sidebarItem = $body.find('span.text-body-md.text-darkest').filter((_, el) => {
      return el.textContent?.trim() === 'AI Image Enhancement'
    })

    if (sidebarItem.length) {
      cy.wrap(sidebarItem.first())
        .closest('div.cursor-pointer.items-center.justify-between')
        .click({ force: true })
      return
    }

    cy.contains('AI Image Enhancement').click({ force: true })
  })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

const selectOutdoor = () => {
  dismissBlockingModals()
  cy.get(SEL.generateBtn)
    .parents()
    .find('button, [role="tab"], div')
    .filter(':visible')
    .then(($els) => {
      const outdoor = [...$els].find((el) => el.textContent?.trim() === 'Outdoor')
      if (outdoor) {
        cy.wrap(outdoor).click({ force: true })
        return
      }

      cy.contains('Outdoor').click({ force: true })
    })
}

describe('IE-flow-test', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

  it('completes IE flow: login → upload → gen-1 → download → feedback → bookmark → gen-2 (outdoor)', () => {
    // ── 1. Visit site ─────────────────────────────────────────────────────────
    cy.visit('https://app.aihomedesign.com/')
    cy.wait(3000)
    dismissBlockingModals()

    // ── 2. Login via profile ────────────────────────────────────────────────────
    loginViaProfile()
    cy.wait(3000)

    // ── 3. Open IE uploader ───────────────────────────────────────────────────
    dismissBlockingModals()
    cy.get(SEL.ieCard).click({ force: true })

    // ── 4. Upload image ───────────────────────────────────────────────────────
    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/IE-indoor-test.jpg', { force: true })
    cy.wait(20000)

    // ── 5. Gen-1 trigger + result ───────────────────────────────────────────────
    dismissBlockingModals()
    clickGenerate()
    waitForGen1Results()

    // ── 6. Gen-1 download ───────────────────────────────────────────────────────
    cy.get(SEL.downloadBtn).click({ force: true })
    cy.get(SEL.normalDownloadBtn).click({ force: true })
    cy.wait(10000)

    // ── 7. Feedback ───────────────────────────────────────────────────────────
    dismissBlockingModals()
    submitFeedback()
    verifyFeedbackAndWaitClose()

    // ── 8. Bookmark ─────────────────────────────────────────────────────────────
    bookmarkAndVerify()

    // ── 9. Gen-2: Outdoor ─────────────────────────────────────────────────────
    openIESidebar()
    selectOutdoor()
    clickGenerate()
    cy.wait(30000)
  })
})
