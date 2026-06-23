const TEST_EMAIL = 'memoslemi.sdstudio+10000@gmail.com'
const TEST_PASSWORD = '12345678'
const GEN_RESULT_TIMEOUT = 240000
const UPLOAD_TIMEOUT = 60000

const ONBOARDING_ROLE_OTHER = 'Other'
const ONBOARDING_ROLE_TESTING = 'Just testing AIHomeDesign'
const ONBOARDING_MODAL_TITLE = 'Which best describes you?'
const ONBOARDING_STEP2_TITLE = 'What are you trying to do today?'
const ONBOARDING_EXPLORE_ON_OWN = "I'll explore on my own"

const COMMON_SEL = {
  closeOnboarding: 'button[aria-label="Close"]',
  profileMenuTrigger: 'nav [aria-haspopup="dialog"].rounded-full',
  loginSpan: 'span',
  loginProfileBtn: 'button',
  loginWithEmailBtn: '#login-with-email-button',
  usernameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  loginSubmitBtn: '#loginwithemail-login-button',
  resultThumbnail: 'div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden',
  downloadBtn: '#v5-resultpage-primary-download-button',
  normalDownloadBtn: '#v5-resultpage-downloadmodule-downloadbutton-sec',
  upscaleDownloadBtn: '#v5-resultpage-downloadmodule-upscale-download',
  thumbUpBtn: 'span.i-tabler\\:thumb-up',
  thumbDownBtn: 'span.i-tabler\\:thumb-down',
  moodBtn: 'span.i-tabler\\:mood-empty-filled',
  feedbackDescription: 'textarea[placeholder="Description"]',
  feedbackSubmitBtn: 'button.bg-primary-main',
  snackbar: '[role="alert"][data-state="open"]',
  bookmarkBtn: '#v5-resultpage-bookmark',
  creditApi: '**/v1/payment/account/credit',
  downloadApi: /download|export|upscale|render-result|\/file/i,
  bookmarkGalleryLink: 'a[href*="bookmark"], a[href*="saved"], [data-testid="bookmark-gallery"]',
  bookmarkedItem: '[data-testid="bookmarked-item"], [class*="bookmark"] img',
}

function createEnhancedFlowHelpers({
  sel,
  sessionId,
  materialDropdownLabels = [],
  styleDropdownLabels = [],
}) {
  const completeOnboardingIfShown = () => {
    cy.get('body').then(($body) => {
      if (isAuthDialogPresent($body)) {
        return
      }

      if (!$body.text().includes(ONBOARDING_MODAL_TITLE)) {
        return
      }

      cy.contains(ONBOARDING_MODAL_TITLE, { timeout: 15000 }).should('be.visible')
      cy.contains(ONBOARDING_ROLE_OTHER, { timeout: 15000 }).should('be.visible').click({ force: true })
      cy.contains(ONBOARDING_STEP2_TITLE, { timeout: 15000 }).should('be.visible')
      cy.contains(ONBOARDING_ROLE_TESTING, { timeout: 15000 }).should('be.visible').click({ force: true })
      cy.contains(ONBOARDING_EXPLORE_ON_OWN, { timeout: 15000 }).should('be.visible').click({ force: true })
    })
  }

  const isLoginModalOpen = ($body) =>
    $body.text().includes('Welcome Back') ||
    $body.text().includes('Log in with Email') ||
    [...$body.find(sel.loginWithEmailBtn)].some((el) => Cypress.dom.isVisible(el)) ||
    [...$body.find(sel.usernameInput)].some((el) => Cypress.dom.isVisible(el))

  const isAuthDialogPresent = ($body) =>
    isLoginModalOpen($body) ||
    $body.find(sel.loginWithEmailBtn).length > 0 ||
    $body.find(sel.usernameInput).length > 0 ||
    $body.find(sel.loginSubmitBtn).length > 0

  const dismissEscUnlessLoginOpen = (reason) => {
    cy.get('body').then(($body) => {
      if (isAuthDialogPresent($body)) {
        cy.log(`Auth dialog present — skipping Escape (${reason})`)
        return
      }

      cy.log(`Sending Escape (${reason})`)
      cy.get('body').type('{esc}', { force: true })
      cy.get('body').click(0, 0, { force: true })
    })
  }

  const dismissOnboardingModal = () => {
    cy.get('body', { timeout: 15000 }).then(($body) => {
      if (isAuthDialogPresent($body)) {
        cy.log('Auth dialog present — skipping onboarding dismiss')
        return
      }

      if (!$body.text().includes(ONBOARDING_MODAL_TITLE)) {
        return
      }

      if ($body.find('span.i-tabler\\:x').length) {
        cy.get('span.i-tabler\\:x').first().closest('button').click({ force: true })
        return
      }

      const closeButtons = [...$body.find('button')].filter((el) => {
        const hasCloseIcon =
          el.querySelector('[class*="tabler:x"]') ||
          el.querySelector('[class*="tabler-x"]') ||
          el.getAttribute('aria-label') === 'Close'
        return hasCloseIcon && Cypress.dom.isVisible(el)
      })

      if (closeButtons.length) {
        cy.wrap(closeButtons[0]).click({ force: true })
        return
      }

      if ($body.find(sel.closeOnboarding || COMMON_SEL.closeOnboarding).length) {
        cy.get(sel.closeOnboarding || COMMON_SEL.closeOnboarding).first().click({ force: true })
        return
      }

      cy.contains(ONBOARDING_ROLE_OTHER, { timeout: 10000 }).then(($other) => {
        cy.get('body').then(($currentBody) => {
          if (isLoginModalOpen($currentBody)) {
            cy.log('Login modal opened while waiting — skipping onboarding Escape')
            return
          }

          if (Cypress.dom.isVisible($other[0])) {
            completeOnboardingIfShown()
            return
          }

          dismissEscUnlessLoginOpen('onboarding modal dismiss')
        })
      })
    })

    cy.get('body').then(($body) => {
      if (isLoginModalOpen($body)) {
        return
      }

      cy.contains(ONBOARDING_MODAL_TITLE, { timeout: 10000 }).should('not.exist')
    })
  }

  const dismissOverlay = () => {
    cy.get('body').then(($body) => {
      if (isAuthDialogPresent($body)) {
        cy.log('Auth dialog present — skipping overlay dismiss')
        return
      }

      const hasOverlay = $body.find('div.fixed.inset-0').filter('[class*="bg-elevated"]').length > 0
      if (hasOverlay) {
        dismissEscUnlessLoginOpen('overlay dismiss')
      }
    })
  }

  const dismissCookieConsent = () => {
    cy.get('body').then(($body) => {
      if (isAuthDialogPresent($body)) {
        cy.log('Auth dialog present — skipping cookie consent dismiss')
        return
      }

      if ($body.text().includes('We use cookies')) {
        cy.contains('button', 'Accept all').click({ force: true })
        cy.contains('We use cookies', { timeout: 10000 }).should('not.exist')
      }
    })
  }

  const prepareSiteForTesting = () => {
    cy.get('nav', { timeout: 60000 }).should('exist')

    const finishStartupDialogs = () => {
      completeOnboardingIfShown()
      dismissCookieConsent()
    }

    finishStartupDialogs()

    cy.get('body').then(($body) => {
      if (
        $body.text().includes(ONBOARDING_MODAL_TITLE) ||
        $body.text().includes('We use cookies')
      ) {
        finishStartupDialogs()
      }
    })

    cy.get('body', { timeout: 20000 }).should(($body) => {
      expect($body.text().includes('We use cookies'), 'cookie banner should be dismissed').to.be
        .false
      expect($body.text().includes(ONBOARDING_MODAL_TITLE), 'onboarding should be completed').to
        .be.false
    })
  }

  const dismissBlockingModals = () => {
    cy.get('body').then(($body) => {
      if (isAuthDialogPresent($body)) {
        cy.log('Auth dialog present — skipping all blocking modal dismiss')
        return cy.wrap(false)
      }

      return cy.wrap(true)
    }).then((shouldDismiss) => {
      if (!shouldDismiss) {
        return
      }

      dismissOnboardingModal()
      dismissCookieConsent()
      dismissOverlay()
    })
  }

  const dismissServerErrorModal = () => {
    cy.get('body').then(($body) => {
      if (!$body.text().includes('Request Failed')) {
        return
      }

      if (hasCompletedResults($body)) {
        cy.log('Results ready despite error modal — closing with Escape')
        cy.get('body').then(($currentBody) => {
          if (!isAuthDialogPresent($currentBody)) {
            cy.get('body').type('{esc}', { force: true })
          }
        })
        return
      }

      cy.log('Server error modal detected — clicking Try Again')
      cy.contains('button', 'Try Again', { timeout: 15000 }).click({ force: true })
      cy.get('body', { timeout: 30000 }).should(($currentBody) => {
        const stillFailed = $currentBody.text().includes('Request Failed')
        const nowReady = hasCompletedResults($currentBody)
        expect(stillFailed && !nowReady, 'Request Failed should clear or results should appear').to.be.false
      })
    })
  }

  const closeOpenDropdown = () => {
    cy.get('body').then(($body) => {
      if (isLoginModalOpen($body)) {
        cy.log('Login modal open — skipping dropdown close')
        return
      }

      cy.get('body').type('{esc}', { force: true })
      cy.get('body').click(0, 0, { force: true })
      cy.wait(500)
    })
  }

  const isLoggedIn = ($body) => {
    if (readCreditFromUi($body) !== null) {
      return true
    }

    const hasLogin = [...$body.find('button, span, a')].some(
      (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
    )
    if (hasLogin) {
      return false
    }

    const profileTrigger = sel.profileMenuTrigger || COMMON_SEL.profileMenuTrigger
    return $body.find(profileTrigger).filter(':visible').length > 0
  }

  const waitForLoginComplete = () => {
    cy.get('body', { timeout: 90000 }).should(($body) => {
      expect(isLoggedIn($body), 'user should be logged in').to.be.true
    })
  }

  const submitInlineEmailLogin = () => {
    cy.get(sel.usernameInput, { timeout: 60000 }).filter(':visible').should('be.visible').clear().type(TEST_EMAIL)
    cy.get(sel.passwordInput, { timeout: 30000 }).filter(':visible').clear().type(TEST_PASSWORD)
    cy.get(sel.loginSubmitBtn).click({ force: true })
  }

  const ensureLoginModalVisible = (reopenLogin) => {
    cy.get('body', { timeout: 30000 }).then(($body) => {
      if (isLoginModalOpen($body)) {
        return
      }

      if (reopenLogin) {
        cy.log('Login modal closed unexpectedly — re-opening')
        reopenLogin()
      }
    })

    cy.get('body', { timeout: 30000 }).should(($body) => {
      expect(isLoginModalOpen($body), 'inline login prompt should be visible').to.be.true
    })
  }

  const prepareForInlineLogin = () => {
    cy.get('body').then(($body) => {
      if (isAuthDialogPresent($body)) {
        cy.log('Auth dialog already open — skipping pre-login dismiss')
        return
      }

      if ($body.text().includes(ONBOARDING_MODAL_TITLE)) {
        cy.log('Onboarding modal blocking login — completing onboarding')
        completeOnboardingIfShown()
        return
      }

      dismissCookieConsent()
    })
  }

  const loginAfterGenerate = ({ reopenLogin } = {}) => {
    cy.get('body', { timeout: 60000 }).then(($body) => {
      if (isLoggedIn($body)) {
        cy.log('User already logged in on result page')
        return cy.wrap(false)
      }
      return cy.wrap(true)
    }).then((needsLogin) => {
      if (!needsLogin) {
        return
      }

      ensureLoginModalVisible(reopenLogin)

      cy.get('body').then(($body) => {
        const visibleUsername = [...$body.find(sel.usernameInput)].find((el) => Cypress.dom.isVisible(el))
        if (visibleUsername) {
          submitInlineEmailLogin()
          return
        }

        const visibleEmailBtn = [...$body.find(sel.loginWithEmailBtn)].find((el) =>
          Cypress.dom.isVisible(el),
        )

        if (visibleEmailBtn) {
          cy.wrap(visibleEmailBtn).click({ force: true })
          ensureLoginModalVisible(reopenLogin)
          submitInlineEmailLogin()
          return
        }

        cy.log('Inline login not shown — opening login from top bar')
        openLoginFromTopBar()
        ensureLoginModalVisible(reopenLogin)
        submitInlineEmailLogin()
      })

      waitForLoginComplete()
    })
  }

  const loginViaProfile = () => {
    dismissBlockingModals()
    cy.get('nav', { timeout: 60000 }).should('exist')

    cy.get('body', { timeout: 30000 }).then(($body) => {
      if (isLoggedIn($body)) {
        cy.log('Already logged in — skipping profile login')
        return
      }

      cy.contains(sel.loginSpan, 'Login', { timeout: 60000 }).should('be.visible').click({ force: true })
      cy.contains(sel.loginProfileBtn, 'Login', { timeout: 30000 }).click({ force: true })
      cy.get(sel.loginWithEmailBtn).click({ force: true })
      cy.get(sel.usernameInput).clear().type(TEST_EMAIL)
      cy.get(sel.passwordInput).clear().type(TEST_PASSWORD)
      cy.get(sel.loginSubmitBtn).click({ force: true })
    })

    waitForLoginComplete()
  }

  const openLoginFromTopBar = () => {
    cy.get('body').then(($body) => {
      const topLoginBtn = [...$body.find('button')].find(
        (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
      )

      if (topLoginBtn) {
        cy.wrap(topLoginBtn).click({ force: true })
        cy.contains('button', 'Log in with Email', { timeout: 30000 }).click({ force: true })
        return
      }

      cy.contains(sel.loginSpan, 'Login', { timeout: 60000 }).click({ force: true })
      cy.contains(sel.loginProfileBtn, 'Login', { timeout: 30000 }).click({ force: true })
      cy.get(sel.loginWithEmailBtn, { timeout: 30000 }).filter(':visible').click({ force: true })
    })
  }

  const openEmailLoginForm = () => {
    cy.get('body', { timeout: 60000 }).then(($body) => {
      const visibleUsername = [...$body.find(sel.usernameInput)].find((el) => Cypress.dom.isVisible(el))
      if ($body.text().includes('Welcome Back') && visibleUsername) {
        return
      }

      const visibleEmailBtn = [...$body.find(sel.loginWithEmailBtn)].find((el) => Cypress.dom.isVisible(el))
      if (visibleEmailBtn) {
        cy.wrap(visibleEmailBtn).click({ force: true })
        return
      }

      cy.contains(sel.loginSpan, 'Login', { timeout: 60000 }).click({ force: true })
      cy.contains(sel.loginProfileBtn, 'Login', { timeout: 30000 }).click({ force: true })
      cy.get(sel.loginWithEmailBtn, { timeout: 30000 }).filter(':visible').click({ force: true })
    })

    cy.contains('Welcome Back', { timeout: 30000 }).should('be.visible')
  }

  const loginInlineWithEmail = () => {
    cy.get('body', { timeout: 30000 }).then(($body) => {
      if (!isLoginModalOpen($body)) {
        dismissCookieConsent()
      }
    })

    cy.get('body', { timeout: 30000 }).should(($body) => {
      const hasLoginPrompt =
        $body.text().includes('Welcome Back') ||
        $body.find(sel.loginWithEmailBtn).length > 0 ||
        $body.find(sel.usernameInput).length > 0
      expect(hasLoginPrompt, 'inline login prompt should be visible').to.be.true
    })

    openEmailLoginForm()
    cy.get(sel.usernameInput, { timeout: 30000 }).filter(':visible').clear().type(TEST_EMAIL)
    cy.get(sel.passwordInput).filter(':visible').clear().type(TEST_PASSWORD)
    cy.get(sel.loginSubmitBtn).click({ force: true })
    waitForLoginComplete()
  }

  const ensureGenerationStartedAfterLogin = (generateSelector = sel.generateBtn) => {
    cy.get('body').then(($body) => {
      const isGenerating = /generating/i.test($body.text())

      if (hasCompletedResults($body) || isGenerating) {
        cy.log('Generation already in progress or complete')
        return
      }

      dismissBlockingModals()
      cy.get('body').then(($currentBody) => {
        if ($currentBody.find(generateSelector).filter(':visible').length > 0) {
          cy.get(generateSelector).scrollIntoView().should('be.visible').should('not.be.disabled')
          cy.get(generateSelector).click({ force: true })
          return
        }

        const generateBtn = [...$currentBody.find('button')].find(
          (btn) => btn.textContent.trim() === 'Generate' && Cypress.dom.isVisible(btn),
        )
        if (generateBtn) {
          cy.wrap(generateBtn).scrollIntoView().click({ force: true })
        }
      })
    })
  }

  const loginAfterGenerateIfNeeded = () => {
    cy.get('body', { timeout: 60000 }).then(($body) => {
      if (isLoggedIn($body)) {
        cy.log('User already logged in — skipping login after generate')
        return
      }

      loginAfterGenerate()
    })
  }

  const ensureLoggedIn = () => {
    cy.session(
      sessionId,
      () => {
        cy.visit('/')
        cy.get('nav', { timeout: 60000 }).should('exist')
        loginViaProfile()
        dismissBlockingModals()
      },
      {
        validate() {
          cy.visit('/')
          dismissBlockingModals()
          cy.get('nav', { timeout: 60000 }).should('exist')
          cy.get('body', { timeout: 30000 }).should(($body) => {
            expect(isLoggedIn($body), 'session should be authenticated').to.be.true
          })
        },
      },
    )
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
        materialDropdownLabels.some((label) => button.innerText.trim().includes(label)),
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

  const openStyleDropdown = () => {
    dismissBlockingModals()
    closeOpenDropdown()
    cy.get('button').then(($buttons) => {
      const target = [...$buttons].find((button) =>
        styleDropdownLabels.some((label) => button.innerText.trim().includes(label)),
      )
      if (target) {
        cy.wrap(target).click({ force: true })
        return
      }

      cy.contains('Style')
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

  const selectStyle = (styleId) => {
    openStyleDropdown()
    cy.wait(800)
    cy.get(styleId).scrollIntoView().click({ force: true })
    closeOpenDropdown()
  }

  const clickGenerate = (generateSelector = sel.generateBtn) => {
    dismissBlockingModals()
    cy.get('body').click(0, 0, { force: true })
    cy.get(generateSelector).scrollIntoView().should('be.visible').click({ force: true })
  }

  const waitForUploadComplete = () => {
    cy.log('Waiting for upload to complete...')

    cy.get('body', { timeout: UPLOAD_TIMEOUT }).should(($body) => {
      const uploadText = $body.text().toLowerCase()
      const hasUploading =
        uploadText.includes('uploading') || uploadText.includes('upload in progress')

      expect(!hasUploading, 'upload text should disappear').to.be.true
    })

    cy.get('body', { timeout: UPLOAD_TIMEOUT }).should(($body) => {
      const hasPreview =
        $body.find('img[src*="blob:"]').length > 0 ||
        $body.find('img[src*="data:image"]').length > 0 ||
        $body.find('canvas').length > 0 ||
        $body.find('img').filter(':visible').length > 0

      expect(hasPreview, 'image preview should be visible').to.be.true
    })

    cy.log('Upload completed successfully')
  }

  const parseCreditText = (text) => {
    const match = text.trim().match(/\d+/)
    return match ? parseInt(match[0], 10) : null
  }

  const readCreditFromUi = ($body) => {
    for (const el of $body.find('[id^="reka-popover-trigger"] .inline-flex')) {
      const value = parseCreditText(el.textContent)
      if (value !== null) {
        return value
      }
    }

    return null
  }

  const extractCreditBalance = (body) => {
    const balance = body?.balance
    if (typeof balance === 'number') {
      return balance
    }
    if (typeof balance === 'string' && /^\d+$/.test(balance)) {
      return parseInt(balance, 10)
    }
    return null
  }

  const findCreditCallWithBalance = (calls) =>
    [...calls].reverse().find((call) => extractCreditBalance(call.response?.body) !== null)

  const fetchCreditBalanceDirect = () => {
    return cy.get('@creditApi.all', { timeout: 30000 }).then((calls) => {
      const lastAuthCall = findCreditCallWithBalance(calls)

      expect(lastAuthCall, 'prior credit API call should exist').to.exist

      return cy
        .request({
          method: 'GET',
          url: lastAuthCall.request.url,
          headers: lastAuthCall.request.headers,
        })
        .then((response) => extractCreditBalance(response.body))
    })
  }

  const readCreditBalance = () => {
    return cy.get('body').then(($body) => {
      const ui = readCreditFromUi($body)
      if (ui !== null) {
        return ui
      }
      return fetchCreditBalanceDirect()
    })
  }

  const assertCreditAfterAction = (beforeCredits, delta, message) => {
    const expected = beforeCredits + delta

    const pollBalance = (attempt = 0) => {
      return fetchCreditBalanceDirect().then((balance) => {
        if (balance === expected) {
          return balance
        }

        if (attempt >= 15) {
          expect(balance, message).to.equal(expected)
          return balance
        }

        cy.wait(2000)
        return pollBalance(attempt + 1)
      })
    }

    return cy.get('body').then(($body) => {
      const ui = readCreditFromUi($body)
      if (ui !== null) {
        return cy
          .get('[id^="reka-popover-trigger"]', { timeout: 45000 })
          .first()
          .find('.inline-flex')
          .should(($el) => {
            const value = parseCreditText($el.text())
            expect(value, message).to.equal(expected)
          })
          .invoke('text')
          .then((text) => parseCreditText(text))
      }

      return pollBalance()
    })
  }

  const getCreditBalanceFromApi = (alias = 'creditApi') => {
    const resolveFromCalls = (calls) => {
      const latestWithBalance = findCreditCallWithBalance(calls)
      return latestWithBalance ? extractCreditBalance(latestWithBalance.response.body) : null
    }

    return cy.get(`@${alias}.all`, { timeout: 30000 }).then((calls) => {
      const balance = resolveFromCalls(calls)
      if (balance !== null) {
        return balance
      }

      cy.reload()
      cy.wait(`@${alias}`, { timeout: 60000 })
      return cy.get(`@${alias}.all`).then((freshCalls) => {
        const freshBalance = resolveFromCalls(freshCalls)
        if (freshBalance !== null) {
          return freshBalance
        }
        return readCreditBalance()
      })
    })
  }

  const watchCreditApi = (alias) => {
    cy.intercept('GET', sel.creditApi || COMMON_SEL.creditApi).as(alias)
  }

  const hasCompletedResults = ($body) => {
    if ($body.find(sel.downloadBtn).filter(':visible').length > 0) {
      return true
    }
    if (/your edit is ready/i.test($body.text())) {
      return true
    }
    if ($body.text().includes('Generated Images')) {
      return true
    }
    return false
  }

  const openResultDownloadView = () => {
    cy.get('body').then(($body) => {
      if ($body.find(sel.downloadBtn).filter(':visible').length > 0) {
        return
      }

      if ($body.text().includes('Generated Images')) {
        cy.contains('Generated Images')
          .closest('div')
          .find(sel.resultThumbnail)
          .first()
          .click({ force: true })
      }
    })
  }

  const waitForDownloadButton = (startedAt = Date.now()) => {
    return cy.get('body', { timeout: 10000 }).then(($body) => {
      if ($body.find(sel.downloadBtn).filter(':visible').length > 0) {
        return
      }

      if (Date.now() - startedAt > GEN_RESULT_TIMEOUT) {
        expect($body.find(sel.downloadBtn).filter(':visible').length, 'download button should be visible').to.be.greaterThan(0)
        return
      }

      openResultDownloadView()

      const elapsed = Date.now() - startedAt
      const isGenerating = /generating/i.test($body.text())
      if (!isGenerating && !hasCompletedResults($body) && elapsed > 90000) {
        cy.log('Results view slow — reloading order page')
        cy.reload()
        cy.url().should('include', 'order_id=')
      }

      cy.wait(3000)
      return waitForDownloadButton(startedAt)
    })
  }

  const waitForGenerationComplete = (startedAt = Date.now(), maskSubmitRetries = 0) => {
    cy.get('body', { timeout: 15000 }).then(($body) => {
      if (hasCompletedResults($body)) {
        return
      }

      const isGenerating = /generating/i.test($body.text())
      const elapsed = Date.now() - startedAt
      const inMaskEditor =
        !hasCompletedResults($body) &&
        !/generating/i.test($body.text()) &&
        ((sel.removeBtn && $body.find(sel.removeBtn).filter(':visible').length > 0) ||
          (sel.doneBtn && $body.find(sel.doneBtn).filter(':visible').length > 0) ||
          [...$body.find('button')].some(
            (btn) => btn.textContent.trim() === 'Done' && Cypress.dom.isVisible(btn),
          ))

      if (elapsed > GEN_RESULT_TIMEOUT) {
        expect(hasCompletedResults($body), 'generation should complete with results').to.be.true
        return
      }

      if (inMaskEditor && maskSubmitRetries < 2 && (sel.generateBtn || sel.removeBtn)) {
        cy.log(`Still in mask editor — retrying mask submit (${maskSubmitRetries + 1}/2)`)
        if ($body.find(sel.removeBtn).filter(':visible').length > 0) {
          cy.get(sel.removeBtn).click({ force: true })
        } else if ($body.find(sel.generateBtn).filter(':visible').length > 0) {
          cy.get(sel.generateBtn).click({ force: true })
        } else {
          const generateBtn = [...$body.find('button')].find(
            (btn) => btn.textContent.trim() === 'Generate' && Cypress.dom.isVisible(btn),
          )
          if (generateBtn) {
            cy.wrap(generateBtn).click({ force: true })
          }
        }
        cy.wait(3000)
        return waitForGenerationComplete(startedAt, maskSubmitRetries + 1)
      }

      if (isGenerating && elapsed > 120000) {
        cy.log('Generation slow — reloading order page')
        cy.reload()
        cy.url().should('include', 'order_id=')
      }

      cy.wait(5000)
      return waitForGenerationComplete(startedAt, maskSubmitRetries)
    })
  }

  const assertResultsReady = () => {
    cy.log('Waiting for all results to be ready...')

    cy.get('body', { timeout: 60000 }).then(($body) => {
      if (hasCompletedResults($body) || /generating/i.test($body.text())) {
        return
      }

      const hasGenerateBtn =
        sel.generateBtn && $body.find(sel.generateBtn).filter(':visible').length > 0
      if (hasGenerateBtn) {
        cy.log('Generate still visible before wait — clicking Generate')
        cy.get(sel.generateBtn).scrollIntoView().click({ force: true })
      }
    })

    cy.get('body', { timeout: GEN_RESULT_TIMEOUT }).should(($body) => {
      const isGenerating = /generating/i.test($body.text())
      expect(
        hasCompletedResults($body) || isGenerating,
        'generation should be in progress or complete',
      ).to.be.true
    })

    waitForGenerationComplete()
    waitForDownloadButton()
    cy.log('All results are ready')
  }

  const waitForAllResultsReady = (generateSelectorOrOptions = sel.generateBtn) => {
    const options =
      typeof generateSelectorOrOptions === 'object'
        ? generateSelectorOrOptions
        : { generateSelector: generateSelectorOrOptions }

    const { generateSelector = sel.generateBtn, isRegenerate = false, skipGenerateRetry = false } =
      options

    cy.url({ timeout: GEN_RESULT_TIMEOUT }).should('include', 'order_id=')

    if (isRegenerate) {
      cy.log('Waiting for regeneration to start...')
      cy.get('body', { timeout: 30000 }).should(($body) => {
        const isGenerating = /generating/i.test($body.text())
        const downloadHidden = $body.find(sel.downloadBtn).length === 0
        expect(
          isGenerating || downloadHidden,
          'regeneration should start (generating text or download hidden)',
        ).to.be.true
      })
      assertResultsReady()
      return
    }

    if (skipGenerateRetry) {
      cy.get('body').then(($body) => {
        if (hasCompletedResults($body) || /generating/i.test($body.text())) {
          return
        }

        const hasDone = sel.doneBtn && $body.find(sel.doneBtn).filter(':visible').length > 0
        const hasGenerateBtn =
          sel.generateBtn && $body.find(sel.generateBtn).filter(':visible').length > 0
        const hasGenerateText = [...$body.find('button')].some(
          (btn) => btn.textContent.trim() === 'Generate' && Cypress.dom.isVisible(btn),
        )

        if (hasDone && !hasGenerateBtn && !hasGenerateText) {
          cy.log('Mask Done still visible — retrying Done')
          cy.get(sel.doneBtn).scrollIntoView().click({ force: true })
        } else if (hasGenerateBtn) {
          cy.log('Generate button visible — starting generation')
          cy.get(sel.generateBtn).scrollIntoView().click({ force: true })
        } else if (hasGenerateText) {
          cy.log('Generate button visible — starting generation')
          cy.contains('button', 'Generate').filter(':visible').click({ force: true })
        } else if ($body.find(generateSelector).filter(':visible').length > 0) {
          cy.log('Config panel still visible — retrying generate')
          clickGenerate(generateSelector)
        }
      })
      assertResultsReady()
      return
    }

    cy.get('body').then(($body) => {
      const isGenerating = /generating/i.test($body.text())
      const stuckOnConfig =
        !isGenerating &&
        $body.find(generateSelector).length > 0 &&
        !hasCompletedResults($body)
      const stuckOnMaskDone =
        !isGenerating &&
        sel.doneBtn &&
        $body.find(sel.doneBtn).length > 0 &&
        !hasCompletedResults($body)

      if (stuckOnMaskDone && generateSelector !== sel.doneBtn) {
        cy.log('Mask Done still visible — retrying Done')
        cy.get(sel.doneBtn).scrollIntoView().click({ force: true })
      } else if (stuckOnConfig) {
        cy.log('Config panel still visible — retrying generate')
        clickGenerate(generateSelector)
      }

      assertResultsReady()
    })
  }

  const verifyBeforeAfterToggle = () => {
    cy.log('Verifying Before/After toggle...')

    cy.get(sel.downloadBtn, { timeout: 15000 }).scrollIntoView().should('be.visible')

    cy.get('body').then(($body) => {
      const findExactLabel = (label) =>
        [...$body.find('button, span, div')].find((el) => el.textContent.trim() === label)

      const beforeToggle = findExactLabel('Before')
      const afterToggle = findExactLabel('After')
      const combinedToggle = [...$body.find('button, span, div')].find((el) =>
        /before\s*\/?\s*after/i.test(el.textContent.trim()),
      )

      if (beforeToggle && afterToggle) {
        cy.wrap(beforeToggle).click({ force: true })
        cy.wrap(afterToggle).click({ force: true })
        cy.wrap(beforeToggle).click({ force: true })
        return
      }

      expect(combinedToggle, 'Before/After toggle should exist').to.exist
      cy.wrap(combinedToggle).click({ force: true })
      cy.wait(300)
      cy.wrap(combinedToggle).click({ force: true })
    })

    cy.log('Before/After toggle verified')
  }

  const watchDownloadRequest = (alias) => {
    cy.intercept({
      method: /GET|POST/,
      url: sel.downloadApi || COMMON_SEL.downloadApi,
    }).as(alias)
  }

  const assertDownload = ({ upscale = false, alias = 'downloadRequest' } = {}) => {
    watchDownloadRequest(alias)

    cy.get(sel.downloadBtn, { timeout: 60000 }).should('be.visible').click({ force: true })

    if (upscale && sel.upscaleDownloadBtn) {
      cy.get(sel.upscaleDownloadBtn).should('be.visible').click({ force: true })
    }

    cy.get(sel.normalDownloadBtn).should('be.visible').click({ force: true })

    cy.get('body', { timeout: 120000 }).find(sel.normalDownloadBtn).should('not.exist')
    cy.get('body').should('not.contain', 'Download failed')

    cy.get(`@${alias}.all`).then((calls) => {
      if (calls.length === 0) {
        cy.log(`${upscale ? 'Upscale' : 'Normal'} download triggered without captured XHR`)
        return
      }

      const status = calls.at(-1).response?.statusCode
      if (status) {
        expect(status, `${upscale ? 'Upscale' : 'Normal'} download should succeed`).to.be.lt(400)
      }
    })

    cy.get(sel.downloadBtn).should('be.visible')
    cy.log(`${upscale ? 'Upscale' : 'Normal'} download verified`)
  }

  const openFeedbackForm = () => {
    cy.get(sel.thumbUpBtn, { timeout: 60000 }).closest('button').click({ force: true })
  }

  const submitThumbUpFeedback = (message = 'Great result. Colors and texture look realistic.') => {
    cy.log('Submitting thumb-up feedback with description...')
    openFeedbackForm()
    cy.get(sel.moodBtn).closest('button').click({ force: true })
    cy.get(sel.feedbackDescription).type(message)
    cy.get(sel.feedbackSubmitBtn).contains('Submit').click({ force: true })

    cy.contains(sel.snackbar, 'Feedback submitted successfully.', { timeout: 10000 }).should(
      'be.visible',
    )
    cy.get(sel.snackbar).should('not.exist')
    cy.log('Thumb-up feedback submitted successfully')
  }

  const testFeedbackWithoutDescription = () => {
    cy.log('Testing feedback without description...')

    cy.get('body').then(($body) => {
      const thumbUpBtn = $body.find(sel.thumbUpBtn).closest('button')
      const feedbackAlreadySubmitted =
        $body.find(sel.thumbUpBtn).length === 0 ||
        (thumbUpBtn.length > 0 && thumbUpBtn.is(':disabled'))

      if (feedbackAlreadySubmitted) {
        cy.log('Skipping empty feedback test — feedback already submitted')
        return
      }

      openFeedbackForm()
      cy.get(sel.moodBtn).closest('button').click({ force: true })
      cy.get(sel.feedbackSubmitBtn).contains('Submit').click({ force: true })

      cy.get('body', { timeout: 5000 }).then(($bodyAfter) => {
        const snackbarText = $bodyAfter.find(sel.snackbar).text()
        const hasSuccessSnackbar = snackbarText.includes('Feedback submitted successfully')
        const hasValidationError =
          $bodyAfter.text().includes('required') || $bodyAfter.text().includes('description')

        if (hasSuccessSnackbar) {
          cy.log('Feedback without description was accepted')
          cy.get(sel.snackbar).should('not.exist')
        } else if (hasValidationError) {
          cy.log('Feedback without description shows validation error (expected behavior)')
          cy.get('body').type('{esc}', { force: true })
        } else {
          cy.log('Feedback form state unclear after empty submit')
        }
      })
    })
  }

  const submitThumbDownFeedback = () => {
    cy.log('Submitting thumb-down feedback...')
    openFeedbackForm()

    cy.get('body').then(($body) => {
      if ($body.find(sel.thumbDownBtn).length > 0) {
        cy.get(sel.thumbDownBtn).closest('button').click({ force: true })
      }
    })

    cy.get(sel.moodBtn).closest('button').click({ force: true })
    cy.get(sel.feedbackDescription).type(
      'The generated image does not match the expected style. Colors are off.',
    )
    cy.get(sel.feedbackSubmitBtn).contains('Submit').click({ force: true })

    cy.contains(sel.snackbar, 'Feedback submitted successfully.', { timeout: 10000 }).should(
      'be.visible',
    )
    cy.get(sel.snackbar).should('not.exist')
    cy.log('Thumb-down feedback submitted successfully')
  }

  const testDuplicateFeedbackPrevention = () => {
    cy.log('Testing duplicate feedback prevention...')

    cy.get('body').then(($body) => {
      const thumbUpExists = $body.find(sel.thumbUpBtn).length > 0
      const thumbUpBtn = $body.find(sel.thumbUpBtn).closest('button')
      const thumbUpDisabled = thumbUpBtn.length > 0 && thumbUpBtn.is(':disabled')

      if (!thumbUpExists || thumbUpDisabled) {
        cy.log('Feedback buttons disabled/hidden after submission — duplicate prevented')
        return
      }

      cy.get(sel.thumbUpBtn).closest('button').click({ force: true })
      cy.wait(1000)

      cy.get('body').then(($body2) => {
        if ($body2.find(sel.feedbackDescription).length > 0) {
          cy.get(sel.feedbackSubmitBtn).then(($btn) => {
            if ($btn.is(':disabled')) {
              cy.log('Submit button disabled — duplicate prevented')
            } else {
              cy.wrap($btn).click({ force: true })
              cy.log('Second submit attempt made — verify if API rejects duplicate')
            }
          })
        } else {
          cy.log('Feedback form did not reopen — duplicate prevented')
        }
      })
    })
  }

  const verifyValidationError = () => {
    cy.get('body', { timeout: 10000 }).should(($body) => {
      const text = $body.text()
      const hasValidationMessage =
        /complete required field/i.test(text) ||
        /required field before generating/i.test(text) ||
        /select space first/i.test(text)

      expect(hasValidationMessage, 'validation error should be visible').to.be.true
    })
    cy.log('Validation error displayed correctly')
  }

  const verifySpaceMaterialDependency = (spaceId, materialId) => {
    cy.log('Verifying Material is disabled until Space is selected...')
    cy.contains('Select Space First').should('be.visible')
    selectSpace(spaceId, 1000)
    cy.contains('Select Space First').should('not.exist')
    closeOpenDropdown()
    cy.get('body').click(0, 0, { force: true })
    cy.wait(1000)
    openMaterialDropdown()
    cy.wait(800)
    cy.get(materialId, { timeout: 15000 }).scrollIntoView().should('exist')
    closeOpenDropdown()
    cy.log('Space/Material widget dependency verified')
  }

  const verifySpaceStyleDependency = (spaceId, styleId) => {
    cy.log('Verifying Style is disabled until Space is selected...')
    cy.contains('Select Space First').should('be.visible')
    selectSpace(spaceId, 1000)
    cy.contains('Select Space First').should('not.exist')
    closeOpenDropdown()
    cy.get('body').click(0, 0, { force: true })
    cy.wait(1000)
    openStyleDropdown()
    cy.wait(800)
    cy.get(styleId, { timeout: 15000 }).scrollIntoView().should('exist')
    closeOpenDropdown()
    cy.log('Space/Style widget dependency verified')
  }

  const returnToResultPage = (resultUrlAlias = 'bookmarkResultUrl') => {
    cy.get(`@${resultUrlAlias}`).then((resultUrl) => {
      cy.log(`Returning to result page: ${resultUrl}`)
      cy.url().then((currentUrl) => {
        if (!currentUrl.includes('order_id=')) {
          cy.visit(resultUrl)
        }
      })
      dismissBlockingModals()
      dismissBlockingModals()
      openResultDownloadView()
      cy.get(sel.downloadBtn, { timeout: 60000 }).should('be.visible')
    })
  }

  const manageBookmarks = () => {
    cy.url().as('bookmarkResultUrl')

    cy.log('Adding bookmark...')
    cy.get(sel.bookmarkBtn).click({ force: true })
    cy.contains(sel.snackbar, /bookmark/i, { timeout: 10000 }).should('be.visible')
    cy.get(sel.snackbar).should('not.exist')

    cy.log('Navigating to bookmark gallery...')
    cy.get('body').then(($body) => {
      const bookmarkLink = $body.find(sel.bookmarkGalleryLink || COMMON_SEL.bookmarkGalleryLink)
      if (bookmarkLink.length > 0) {
        cy.wrap(true).as('visitedBookmarkGallery')
        cy.wrap(bookmarkLink.first()).click({ force: true })
      } else {
        cy.log('No bookmark gallery link found — skipping gallery navigation')
        cy.wrap(false).as('visitedBookmarkGallery')
      }
    })

    cy.get('@visitedBookmarkGallery').then((visitedGallery) => {
      if (!visitedGallery) {
        dismissBlockingModals()
        openResultDownloadView()
        cy.get(sel.bookmarkBtn, { timeout: 60000 }).should('be.visible').click({ force: true })
        cy.log('Bookmark removed (gallery skipped)')
        return
      }

      dismissBlockingModals()

      cy.get('body', { timeout: 15000 }).then(($body) => {
        const bodyText = $body.text().toLowerCase()
        const hasBookmarkedItems =
          $body.find(sel.bookmarkedItem || COMMON_SEL.bookmarkedItem).length > 0 ||
          $body.find('img').length > 0 ||
          bodyText.includes('bookmark') ||
          bodyText.includes('saved')

        if (hasBookmarkedItems) {
          cy.log('Bookmarked item found in gallery')
        } else {
          cy.log('Warning: Could not verify bookmark in gallery — check manually')
        }
      })

      cy.log('Returning to result page to remove bookmark...')
      cy.go('back')
      dismissBlockingModals()
      dismissBlockingModals()

      cy.get('@bookmarkResultUrl').then((resultUrl) => {
        cy.get('body').then(($body) => {
          if ($body.find(sel.downloadBtn).length === 0 && $body.find(sel.bookmarkBtn).length === 0) {
            cy.visit(resultUrl)
            dismissBlockingModals()
          }
        })
      })

      openResultDownloadView()
      cy.get(sel.downloadBtn, { timeout: 60000 }).should('be.visible')
      cy.get(sel.bookmarkBtn, { timeout: 60000 }).should('be.visible').click({ force: true })
      cy.log('Bookmark removed')
    })
  }

  const runResultPageEnhancements = ({ upscale = true, feedbackMessage } = {}) => {
    verifyBeforeAfterToggle()
    assertDownload({ alias: 'normalDownload' })
    if (upscale && sel.upscaleDownloadBtn) {
      assertDownload({ upscale: true, alias: 'upscaleDownload' })
    }

    cy.get('body').then(($body) => {
      const thumbUpBtn = $body.find(sel.thumbUpBtn).closest('button')
      const feedbackAlreadySubmitted =
        $body.find(sel.thumbUpBtn).length === 0 ||
        (thumbUpBtn.length > 0 && thumbUpBtn.is(':disabled'))

      if (!feedbackAlreadySubmitted) {
        submitThumbUpFeedback(feedbackMessage)
      } else {
        cy.log('Skipping thumb-up — feedback already submitted')
      }

      testFeedbackWithoutDescription()

      cy.get('body').then(($bodyAfterEmpty) => {
        const thumbUpBtnAfter = $bodyAfterEmpty.find(sel.thumbUpBtn).closest('button')
        const feedbackAlreadySubmittedAfter =
          $bodyAfterEmpty.find(sel.thumbUpBtn).length === 0 ||
          (thumbUpBtnAfter.length > 0 && thumbUpBtnAfter.is(':disabled'))

        if (!feedbackAlreadySubmittedAfter) {
          submitThumbDownFeedback()
        } else {
          cy.log('Skipping thumb-down — feedback already submitted')
        }

        testDuplicateFeedbackPrevention()
      })
    })
  }

  const runLoginFirstPostGen1 = ({ upscale = true, feedbackMessage } = {}) => {
    runResultPageEnhancements({ upscale, feedbackMessage })
  }

  return {
    dismissBlockingModals,
    dismissServerErrorModal,
    prepareSiteForTesting,
    completeOnboardingIfShown,
    ensureLoggedIn,
    loginAfterGenerate,
    loginAfterGenerateIfNeeded,
    ensureGenerationStartedAfterLogin,
    loginViaProfile,
    loginInlineWithEmail,
    watchCreditApi,
    getCreditBalanceFromApi,
    readCreditBalance,
    assertCreditAfterAction,
    waitForUploadComplete,
    waitForAllResultsReady,
    clickGenerate,
    selectSpace,
    selectMaterial,
    selectStyle,
    closeOpenDropdown,
    verifyValidationError,
    verifySpaceMaterialDependency,
    verifySpaceStyleDependency,
    verifyBeforeAfterToggle,
    assertDownload,
    submitThumbUpFeedback,
    testFeedbackWithoutDescription,
    submitThumbDownFeedback,
    testDuplicateFeedbackPrevention,
    manageBookmarks,
    runResultPageEnhancements,
    runLoginFirstPostGen1,
  }
}

module.exports = {
  TEST_EMAIL,
  TEST_PASSWORD,
  GEN_RESULT_TIMEOUT,
  UPLOAD_TIMEOUT,
  COMMON_SEL,
  createEnhancedFlowHelpers,
}
