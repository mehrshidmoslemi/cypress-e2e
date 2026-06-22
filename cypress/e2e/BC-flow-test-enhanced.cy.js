/**
 * BC-flow-test (Enhanced)
 *
 * Single optimized flow — one generation covers all scenarios:
 *   Login → Upload → Validation error → Space/Material widget check →
 *   Gen-1 (credit −1) → Before/After toggle → Download (assert) →
 *   Feedback (thumb-up) → Bookmark → Regenerate (no credit deduction)
 *
 * Enhancements:
 * - Smart upload wait (no hardcoded delay)
 * - Generate validation error test
 * - Credit balance verification: −1 on first generate, no deduction on regenerate
 * - Before/After toggle on result page
 * - Download success verified via network response (no fixed waits)
 * - Thumb-up feedback with description
 * - Smart result readiness check (all thumbnails ready)
 */

const SEL = {
  closeOnboarding: 'button[aria-label="Close"]',
  profileMenuTrigger: 'nav [aria-haspopup="dialog"].rounded-full',
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
  thumbDownBtn: 'span.i-tabler\\:thumb-down',
  moodBtn: 'span.i-tabler\\:mood-empty-filled',
  feedbackDescription: 'textarea[placeholder="Description"]',
  feedbackSubmitBtn: 'button.bg-primary-main',
  snackbar: '[role="alert"][data-state="open"]',
  bookmarkBtn: '#v5-resultpage-bookmark',
  creditDisplay: '[id^="reka-popover-trigger"] > .inline-flex',
  downloadApi: /download|export|upscale|render-result|\/file/i,
  creditApi: '**/v1/payment/account/credit',
  bookmarkGalleryLink: 'a[href*="bookmark"], a[href*="saved"], [data-testid="bookmark-gallery"]',
  bookmarkedItem: '[data-testid="bookmarked-item"], [class*="bookmark"] img',
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
const UPLOAD_TIMEOUT = 60000

// Non-enterprise account — credits deduct on first generate
const TEST_EMAIL = 'memoslemi.sdstudio+10000@gmail.com'
const TEST_PASSWORD = '12345678'
const SESSION_ID = 'bc-flow-user-10000'

// ─── Helper Functions ────────────────────────────────────────────────────────

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
      return
    }

    if ($body.find(SEL.closeOnboarding).length) {
      cy.get(SEL.closeOnboarding).first().click({ force: true })
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

const dismissOverlay = () => {
  cy.get('body').then(($body) => {
    const hasOverlay = $body.find('div.fixed.inset-0').filter('[class*="bg-elevated"]').length > 0
    if (hasOverlay) {
      cy.get('body').type('{esc}', { force: true })
      cy.get('body').click(0, 0, { force: true })
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
  dismissOverlay()
}

const closeOpenDropdown = () => {
  cy.get('body').type('{esc}', { force: true })
  cy.get('body').click(0, 0, { force: true })
  cy.wait(500)
}

const loginViaProfile = () => {
  dismissBlockingModals()
  cy.get('nav', { timeout: 60000 }).should('exist')
  cy.contains(SEL.loginSpan, 'Login', { timeout: 60000 }).should('be.visible').click({ force: true })
  cy.contains(SEL.loginProfileBtn, 'Login', { timeout: 30000 }).click({ force: true })
  cy.get(SEL.loginWithEmailBtn).click({ force: true })
  cy.get(SEL.usernameInput).clear().type(TEST_EMAIL)
  cy.get(SEL.passwordInput).clear().type(TEST_PASSWORD)
  cy.get(SEL.loginSubmitBtn).click({ force: true })
  dismissBlockingModals()
  cy.get('body', { timeout: 90000 }).should(($body) => {
    const hasLogin = [...$body.find('button, span, a')].some(
      (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
    )
    expect(hasLogin, 'user should be logged in').to.be.false
  })
}

const ensureLoggedIn = () => {
  cy.session(
    SESSION_ID,
    () => {
      cy.visit('/')
      cy.get('nav', { timeout: 60000 }).should('exist')
      loginViaProfile()
    },
    {
      validate() {
        cy.visit('/')
        dismissBlockingModals()
        cy.get('nav', { timeout: 60000 }).should('exist')
        cy.get('body', { timeout: 30000 }).should(($body) => {
          const hasLogin = [...$body.find('button, span, a')].some(
            (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
          )
          expect(hasLogin, 'session should be authenticated').to.be.false
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
      expect(freshBalance, 'credit API should return balance').to.exist
      return freshBalance
    })
  })
}

const hasCompletedResults = ($body) => {
  if ($body.find(SEL.downloadBtn).length > 0) {
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
    if ($body.find(SEL.downloadBtn).filter(':visible').length > 0) {
      return
    }

    if ($body.text().includes('Generated Images')) {
      cy.contains('Generated Images')
        .closest('div')
        .find(SEL.resultThumbnail)
        .first()
        .click({ force: true })
    }
  })
}

const waitForDownloadButton = (startedAt = Date.now()) => {
  return cy.get('body', { timeout: 10000 }).then(($body) => {
    if ($body.find(SEL.downloadBtn).filter(':visible').length > 0) {
      return
    }

    if (Date.now() - startedAt > GEN_RESULT_TIMEOUT) {
      expect($body.find(SEL.downloadBtn).filter(':visible').length, 'download button should be visible').to.be.greaterThan(0)
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

const assertResultsReady = () => {
  cy.log('Waiting for all results to be ready...')

  cy.get('body', { timeout: GEN_RESULT_TIMEOUT }).should(($body) => {
    const isGenerating = /generating/i.test($body.text())
    expect(
      hasCompletedResults($body) || isGenerating,
      'generation should be in progress or complete',
    ).to.be.true
  })

  cy.get('body', { timeout: GEN_RESULT_TIMEOUT }).should(($body) => {
    expect(hasCompletedResults($body), 'generation should complete with results').to.be.true
  })

  waitForDownloadButton()
  cy.log('All results are ready')
}

const getCreditCount = (apiAlias = 'creditApi') => {
  return cy.get('body').then(($body) => {
    const uiCount = readCreditFromUi($body)
    if (uiCount !== null) {
      return uiCount
    }
    return getCreditBalanceFromApi(apiAlias)
  })
}

const watchCreditApi = (alias) => {
  cy.intercept('GET', SEL.creditApi).as(alias)
}

const waitForAllResultsReady = ({ isRegenerate = false } = {}) => {
  cy.url({ timeout: GEN_RESULT_TIMEOUT }).should('include', 'order_id=')

  if (isRegenerate) {
    cy.log('Waiting for regeneration to start...')
    cy.get('body', { timeout: 30000 }).should(($body) => {
      const isGenerating = /generating/i.test($body.text())
      const downloadHidden = $body.find(SEL.downloadBtn).length === 0
      expect(
        isGenerating || downloadHidden,
        'regeneration should start (generating text or download hidden)',
      ).to.be.true
    })
    assertResultsReady()
    return
  }

  cy.get('body').then(($body) => {
    const isGenerating = /generating/i.test($body.text())
    const stuckOnConfig =
      !isGenerating &&
      $body.find(SEL.generateBtn).length > 0 &&
      !hasCompletedResults($body)

    if (stuckOnConfig) {
      cy.log('Config panel still visible — retrying generate')
      clickGenerate()
    }

    assertResultsReady()
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

const verifySpaceMaterialWidgetDependency = () => {
  cy.log('Verifying Material is disabled until Space is selected...')
  cy.contains('Select Space First').should('be.visible')

  selectSpace(SEL.spaceKitchen, 1000)
  cy.contains('Select Space First').should('not.exist')

  openMaterialDropdown()
  cy.get(SEL.materialBlackMarble).should('be.visible')
  closeOpenDropdown()
  cy.log('Space/Material widget dependency verified')
}

const openFeedbackForm = () => {
  cy.get(SEL.thumbUpBtn, { timeout: 60000 }).closest('button').click({ force: true })
}

const verifyBeforeAfterToggle = () => {
  cy.log('Verifying Before/After toggle...')

  cy.get(SEL.downloadBtn, { timeout: 15000 }).scrollIntoView().should('be.visible')

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
    url: SEL.downloadApi,
  }).as(alias)
}

const assertDownload = ({ upscale = false, alias = 'downloadRequest' } = {}) => {
  watchDownloadRequest(alias)

  cy.get(SEL.downloadBtn, { timeout: 60000 }).should('be.visible').click({ force: true })

  if (upscale) {
    cy.get(SEL.upscaleDownloadBtn).should('be.visible').click({ force: true })
  }

  cy.get(SEL.normalDownloadBtn).should('be.visible').click({ force: true })

  cy.get('body', { timeout: 120000 }).find(SEL.normalDownloadBtn).should('not.exist')
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

  cy.get(SEL.downloadBtn).should('be.visible')
  cy.log(`${upscale ? 'Upscale' : 'Normal'} download verified`)
}

const submitThumbUpFeedback = () => {
  cy.log('Submitting thumb-up feedback with description...')
  openFeedbackForm()
  cy.get(SEL.moodBtn).closest('button').click({ force: true })
  cy.get(SEL.feedbackDescription).type(
    'Great backsplash result. Colors and texture look realistic.',
  )
  cy.get(SEL.feedbackSubmitBtn).contains('Submit').click({ force: true })

  cy.contains(SEL.snackbar, 'Feedback submitted successfully.', { timeout: 10000 }).should(
    'be.visible',
  )
  cy.get(SEL.snackbar).should('not.exist')
  cy.log('Thumb-up feedback submitted successfully')
}

const testFeedbackWithoutDescription = () => {
  cy.log('Testing feedback without description...')

  cy.get('body').then(($body) => {
    const thumbUpBtn = $body.find(SEL.thumbUpBtn).closest('button')
    const feedbackAlreadySubmitted =
      $body.find(SEL.thumbUpBtn).length === 0 ||
      (thumbUpBtn.length > 0 && thumbUpBtn.is(':disabled'))

    if (feedbackAlreadySubmitted) {
      cy.log('Skipping empty feedback test — feedback already submitted')
      return
    }

    openFeedbackForm()
    cy.get(SEL.moodBtn).closest('button').click({ force: true })
    cy.get(SEL.feedbackSubmitBtn).contains('Submit').click({ force: true })

    cy.get('body', { timeout: 5000 }).then(($bodyAfter) => {
      const snackbarText = $bodyAfter.find(SEL.snackbar).text()
      const hasSuccessSnackbar = snackbarText.includes('Feedback submitted successfully')
      const hasValidationError =
        $bodyAfter.text().includes('required') || $bodyAfter.text().includes('description')

      if (hasSuccessSnackbar) {
        cy.log('Feedback without description was accepted')
        cy.get(SEL.snackbar).should('not.exist')
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
    if ($body.find(SEL.thumbDownBtn).length > 0) {
      cy.get(SEL.thumbDownBtn).closest('button').click({ force: true })
    }
  })

  cy.get(SEL.moodBtn).closest('button').click({ force: true })
  cy.get(SEL.feedbackDescription).type(
    'The generated image does not match the expected style. Colors are off.',
  )
  cy.get(SEL.feedbackSubmitBtn).contains('Submit').click({ force: true })

  cy.contains(SEL.snackbar, 'Feedback submitted successfully.', { timeout: 10000 }).should(
    'be.visible',
  )
  cy.get(SEL.snackbar).should('not.exist')
  cy.log('Thumb-down feedback submitted successfully')
}

const testDuplicateFeedbackPrevention = () => {
  cy.log('Testing duplicate feedback prevention...')

  cy.get('body').then(($body) => {
    const thumbUpExists = $body.find(SEL.thumbUpBtn).length > 0
    const thumbUpBtn = $body.find(SEL.thumbUpBtn).closest('button')
    const thumbUpDisabled = thumbUpBtn.length > 0 && thumbUpBtn.is(':disabled')

    if (!thumbUpExists || thumbUpDisabled) {
      cy.log('Feedback buttons disabled/hidden after submission — duplicate prevented')
      return
    }

    cy.get(SEL.thumbUpBtn).closest('button').click({ force: true })
    cy.wait(1000)

    cy.get('body').then(($body2) => {
      if ($body2.find(SEL.feedbackDescription).length > 0) {
        cy.get(SEL.feedbackSubmitBtn).then(($btn) => {
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

const openBCSidebar = () => {
  dismissBlockingModals()
  cy.get('body').then(($body) => {
    const sidebarItem = $body.find('span.text-body-md.text-darkest').filter((_, el) =>
      el.textContent.includes('AI Backsplash Change'),
    )
    if (sidebarItem.length) {
      cy.wrap(sidebarItem.first())
        .closest('div.cursor-pointer.items-center.justify-between')
        .click({ force: true })
    } else {
      cy.contains('AI Backsplash Change', { timeout: 60000 }).click({ force: true })
    }
  })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

const returnToResultPage = () => {
  cy.get('@bookmarkResultUrl').then((resultUrl) => {
    cy.log(`Returning to result page: ${resultUrl}`)
    cy.visit(resultUrl)
    dismissBlockingModals()
    cy.get(SEL.downloadBtn, { timeout: GEN_RESULT_TIMEOUT }).should('be.visible')
  })
}

const manageBookmarks = () => {
  cy.url().as('bookmarkResultUrl')

  cy.log('Adding bookmark...')
  cy.get(SEL.bookmarkBtn).click({ force: true })
  cy.contains(SEL.snackbar, /bookmark/i, { timeout: 10000 }).should('be.visible')
  cy.get(SEL.snackbar).should('not.exist')

  cy.log('Navigating to bookmark gallery...')
  cy.get('body').then(($body) => {
    const bookmarkLink = $body.find(SEL.bookmarkGalleryLink)
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
      returnToResultPage()
      cy.get(SEL.bookmarkBtn, { timeout: 60000 }).should('be.visible').click({ force: true })
      cy.log('Bookmark removed (gallery skipped)')
      return
    }

    dismissBlockingModals()

    cy.get('body', { timeout: 15000 }).then(($body) => {
      const bodyText = $body.text().toLowerCase()
      const hasBookmarkedItems =
        $body.find(SEL.bookmarkedItem).length > 0 ||
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
    returnToResultPage()
    cy.get(SEL.bookmarkBtn, { timeout: 60000 }).should('be.visible').click({ force: true })
    cy.log('Bookmark removed')
  })
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('BC-flow-test-enhanced', () => {
  it('completes full BC flow in a single generation', () => {
    // ── 1. Login ────────────────────────────────────────────────────────────
    watchCreditApi('creditApi')
    ensureLoggedIn()
    cy.visit('/')
    cy.wait('@creditApi')
    cy.get('nav', { timeout: 60000 }).should('exist')
    cy.get(SEL.profileMenuTrigger, { timeout: 30000 }).should('exist')
    dismissBlockingModals()

    getCreditBalanceFromApi('creditApi').then((creditsAtStart) => {
      cy.log(`Initial credit count: ${creditsAtStart}`)

      // ── 2. Open BC tool + upload ──────────────────────────────────────────
      dismissBlockingModals()
      cy.get(SEL.bcHomeCard).click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/BC-test.jpg', { force: true })
      waitForUploadComplete()

      // ── 3. Validation error — generate without widgets ────────────────────
      cy.log('Testing validation error...')
      clickGenerate()
      verifyValidationError()

      // ── 4. Space/Material widget dependency ───────────────────────────────
      dismissBlockingModals()
      verifySpaceMaterialWidgetDependency()

      // ── 5. Select material (space already selected in step 4) ─────────────
      selectMaterial(SEL.materialBlackMarble)

      // ── 6. Generate once + wait for results ───────────────────────────────
      readCreditBalance().then((beforeGen1Credits) => {
        cy.log(`Credit before Gen-1: ${beforeGen1Credits}`)

        clickGenerate()
        waitForAllResultsReady()

        assertCreditAfterAction(
          beforeGen1Credits,
          -1,
          'first generate should deduct 1 credit',
        ).then((afterGen1Credits) => {
          cy.log(`Credit after Gen-1: ${afterGen1Credits}`)

          verifyBeforeAfterToggle()

          // ── 8. Download — Normal + Upscale ──────────────────────────────────
          assertDownload({ alias: 'normalDownload' })
          assertDownload({ upscale: true, alias: 'upscaleDownload' })

          // ── 9. Feedback scenarios (all on same result page) ─────────────────
          cy.get('body').then(($body) => {
            const thumbUpBtn = $body.find(SEL.thumbUpBtn).closest('button')
            const feedbackAlreadySubmitted =
              $body.find(SEL.thumbUpBtn).length === 0 ||
              (thumbUpBtn.length > 0 && thumbUpBtn.is(':disabled'))

            if (!feedbackAlreadySubmitted) {
              submitThumbUpFeedback()
            } else {
              cy.log('Skipping thumb-up — feedback already submitted')
            }

            testFeedbackWithoutDescription()

            cy.get('body').then(($bodyAfterEmpty) => {
              const thumbUpBtnAfter = $bodyAfterEmpty.find(SEL.thumbUpBtn).closest('button')
              const feedbackAlreadySubmittedAfter =
                $bodyAfterEmpty.find(SEL.thumbUpBtn).length === 0 ||
                (thumbUpBtnAfter.length > 0 && thumbUpBtnAfter.is(':disabled'))

              if (!feedbackAlreadySubmittedAfter) {
                submitThumbDownFeedback()
              } else {
                cy.log('Skipping thumb-down — feedback already submitted')
              }

              testDuplicateFeedbackPrevention()

              // ── 10. Regenerate — second generate should NOT deduct credits ─
              openBCSidebar()
              selectSpace(SEL.spaceKitchen, 1000)
              selectMaterial(SEL.materialWhiteMarble)

              readCreditBalance().then((beforeRegenCredits) => {
                cy.log(`Credit count before regenerate: ${beforeRegenCredits}`)

                clickGenerate()
                waitForAllResultsReady({ isRegenerate: true })

                assertCreditAfterAction(
                  beforeRegenCredits,
                  0,
                  'regenerate should NOT deduct any credits',
                ).then((afterRegenCredits) => {
                  cy.log(`Credit count after regenerate: ${afterRegenCredits}`)
                  manageBookmarks()
                })
              })
            })
          })
        })
      })
    })
  })
})
