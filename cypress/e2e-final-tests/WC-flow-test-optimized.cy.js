/**
 * WC-flow-test (Optimized)
 *
 * Test Suite  : Wall Change (WC) end-to-end flow
 * Coverage    : Login → Upload → Service → Gen-1 → Download (Normal + Upscale) →
 *               Feedback → Bookmark → Gen-2 (Bedroom + Navy Blue Wall)
 *
 * Helpers keep selectors DRY; flow and waits match the working WC-flow-test.cy.js.
 */

const SEL = {
  loginSpan: 'span',
  loginProfileBtn: 'button',
  loginWithEmailBtn: '#login-with-email-button',
  usernameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  loginSubmitBtn: '#loginwithemail-login-button',
  startNowLink: 'a[href="/generate"]',
  fileInput: 'input[type="file"]',
  wcService: '[id="v5-services-page-AI Wall Change"]',
  generateBtn: '#v5-tool-wall-change-generate-button',
  spaceBathroom: '#v5-tool-wall-change-space-bathroom',
  spaceBedroom: '#v5-tool-wall-change-space-bedroom',
  materialWhiteBrick: '#v5-tool-wall-change-material-white-brick-wall',
  materialNavyBlue: '#v5-tool-wall-change-material-navy-blue-wall',
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
const MATERIAL_DROPDOWN_LABELS = ['Brick Wall', 'White Brick Wall', 'Navy Blue Wall']
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

const closeOpenDropdown = () => {
  cy.get('body').type('{esc}', { force: true })
  cy.get('body').click(0, 0, { force: true })
  cy.wait(500)
}

const waitForAppReady = () => {
  cy.get('body', { timeout: 60000 }).should(($body) => {
    expect($body.css('pointer-events'), 'body interactive after login').to.not.equal('none')
  })
}

const enablePointerEvents = () => {
  cy.window().then((win) => {
    win.document.querySelectorAll('.pointer-events-none').forEach((el) => {
      el.style.setProperty('pointer-events', 'auto', 'important')
    })
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
  closeOpenDropdown()

  cy.get('button').then(($buttons) => {
    const target = [...$buttons].find((button) =>
      MATERIAL_DROPDOWN_LABELS.some((label) => button.innerText.trim().includes(label)),
    )

    if (target) {
      cy.wrap(target).click({ force: true })
      return
    }

    cy.contains('Material')
      .parents()
      .find('button span.i-tabler\\:chevron-down')
      .first()
      .click({ force: true })
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

  cy.wait(60000)
  cy.get('body').then(($body) => {
    const hasThumb = $body.find(SEL.resultThumbnail).length > 0
    const hasDownload = $body.find(SEL.downloadBtn).length > 0
    if (!hasThumb && !hasDownload && !$body.text().includes('Your edit is ready')) {
      clickGenerate()
    }
  })

  cy.get('body', { timeout: GEN_RESULT_TIMEOUT }).should(($body) => {
    const hasDownload = $body.find(SEL.downloadBtn).length > 0
    const hasThumb = $body.find(SEL.resultThumbnail).length > 0
    const editReady = $body.text().includes('Your edit is ready')
    expect(hasDownload || hasThumb || editReady, 'generation should complete').to.be.true
  })

  const openResultIfNeeded = () => {
    cy.get('body').then(($body) => {
      if ($body.find(SEL.downloadBtn).length) {
        return
      }

      if ($body.find(SEL.resultThumbnail).length) {
        cy.get(SEL.resultThumbnail).last().click({ force: true })
      }
    })
  }

  openResultIfNeeded()
  cy.wait(3000)
  openResultIfNeeded()

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

const selectWCService = () => {
  dismissBlockingModals()
  cy.get('body').then(($body) => {
    if ($body.find(SEL.wcService).length) {
      cy.get(SEL.wcService).click({ force: true })
      return
    }

    cy.contains('span.text-body-md.text-darkest', 'AI Wall Change')
      .closest('div.cursor-pointer')
      .click({ force: true })
  })
}

const openWCSidebar = () => {
  dismissBlockingModals()

  const clickWCToolEntry = () => {
    cy.get('body').then(($body) => {
      const labels = ['AI Wall Change']
      const match = [...$body.find('span.text-body-md.text-darkest')].find((el) => {
        const text = el.textContent?.trim() || ''
        return labels.includes(text)
      })

      if (match) {
        cy.wrap(match).closest('div.cursor-pointer').click({ force: true })
        return
      }

      cy.contains(/AI Wall Change/i).click({ force: true })
    })
  }

  clickWCToolEntry()

  cy.get('body', { timeout: 30000 }).then(($body) => {
    if ($body.find(SEL.generateBtn).length) {
      return
    }

    cy.url().then((url) => {
      const orderMatch = url.match(/order_id=([^&]+)/)
      if (orderMatch) {
        cy.visit(
          `https://app.aihomedesign.com/generate?tool_slug=tool-wall-change&order_id=${orderMatch[1]}`,
        )
        dismissBlockingModals()
        return
      }

      clickWCToolEntry()
    })
  })

  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

describe('WC-flow-test', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

  it('completes WC flow: login → upload → gen-1 → download (normal + upscale) → feedback → bookmark → gen-2', () => {
    // ── 1. Visit site ─────────────────────────────────────────────────────────
    cy.visit('https://app.aihomedesign.com/')
    cy.wait(3000)
    dismissBlockingModals()

    // ── 2. Login via profile ────────────────────────────────────────────────────
    loginViaProfile()
    cy.wait(3000)

    // ── 3. Open uploader ──────────────────────────────────────────────────────
    dismissBlockingModals()
    cy.get(SEL.startNowLink).contains('Start Now').click({ force: true })

    // ── 4. Upload image ───────────────────────────────────────────────────────
    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/WC-test.jpg', { force: true })
    cy.wait(35000)

    // ── 5. Select Wall Change service ─────────────────────────────────────────
    selectWCService()

    // ── 6. Gen-1 config: Bathroom + White Brick Wall ──────────────────────────
    dismissBlockingModals()
    enablePointerEvents()
    selectSpace(SEL.spaceBathroom, 1000)
    selectMaterial(SEL.materialWhiteBrick)

    // ── 7. Gen-1 trigger + result ───────────────────────────────────────────────
    clickGenerate()
    waitForGen1Results()

    // ── 8. Gen-1 download ─────────────────────────────────────────────────────────

    // ── 8a. Download – Normal ───────────────────────────────────────────────────
    cy.get(SEL.downloadBtn).click({ force: true })
    cy.get(SEL.normalDownloadBtn).click({ force: true })
    cy.wait(10000)

    // ── 8b. Download – Upscale ────────────────────────────────────────────────
    cy.get(SEL.downloadBtn).click({ force: true })
    cy.get(SEL.upscaleDownloadBtn).click({ force: true })
    cy.get(SEL.normalDownloadBtn).click({ force: true })
    cy.wait(25000)

    // ── 9. Feedback ───────────────────────────────────────────────────────────
    dismissBlockingModals()
    submitFeedback()
    verifyFeedbackAndWaitClose()

    // ── 10. Bookmark ────────────────────────────────────────────────────────────
    bookmarkAndVerify()

    // ── 11. Gen-2: Bedroom + Navy Blue Wall ─────────────────────────────────────
    openWCSidebar()
    selectSpace(SEL.spaceBedroom, 1000)
    selectMaterial(SEL.materialNavyBlue)
    clickGenerate()
    cy.wait(30000)
  })
})
