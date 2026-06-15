/**
 * VS-flow-test (Optimized)
 *
 * Test Suite  : Virtual Staging (VS) end-to-end flow
 * Coverage    : Upload → Login → Gen-1 → Download → Feedback → Bookmark →
 *               Gen-2 → Gen-3 → Gen-4
 *
 * Helpers keep selectors DRY; flow and waits match the working VS-flow-test.cy.js.
 */

const SEL = {
  vsCard: '#v5-home-tool-virtual-staging-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-virtual-staging-generate-button',
  restageGenerateBtn: '#v5-tool-virtual-restaging-generate-button',
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
  snackbar: '[role="alert"][data-state="open"]',
  bookmarkBtn: '#v5-resultpage-bookmark',
  removeFurnitureToggle: '#v5-service-ai-virtual-staging-ir-toggle',
}

const ONBOARDING_ROLE_OTHER = 'Other'
const ONBOARDING_ROLE_TESTING = 'Just testing AIHomeDesign'
const ONBOARDING_MODAL_TITLE = 'Which best describes you?'
const ONBOARDING_STEP2_TITLE = 'What are you trying to do today?'
const ONBOARDING_EXPLORE_ON_OWN = "I'll explore on my own"

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

const clickGenerateButton = (selector) => {
  dismissBlockingModals()
  cy.get('body').click(0, 0)
  cy.get(selector).scrollIntoView().should('be.visible').click({ force: true })
}

const clickGenerate = () => clickGenerateButton(SEL.generateBtn)

const clickRestageGenerate = () => clickGenerateButton(SEL.restageGenerateBtn)

const clickSpaceDropdown = () => {
  dismissBlockingModals()
  cy.contains('Space')
    .parents()
    .find('button span.i-tabler\\:chevron-down')
    .first()
    .click({ force: true })
}

const closeOpenDropdown = () => {
  cy.get('body').type('{esc}', { force: true })
  cy.get('body').click(0, 0, { force: true })
  cy.wait(500)
}

const selectSpace = (spaceId, waitMs = 1000) => {
  clickSpaceDropdown()
  cy.wait(waitMs)
  cy.get(`#${spaceId}`).click({ force: true })
  closeOpenDropdown()
}

const selectSpaceByAttr = (spaceId, waitMs = 1000) => {
  clickSpaceDropdown()
  cy.wait(waitMs)
  cy.get(`[id="${spaceId}"]`).click({ force: true })
  closeOpenDropdown()
}

const clickStyleDropdown = () => {
  dismissBlockingModals()
  const styleLabels = ['Prime', 'Modern', 'Hampton', 'Contemporary', 'Scandinavian']
  cy.get('button').then(($buttons) => {
    const target = [...$buttons].find((button) =>
      styleLabels.some((label) => button.innerText.trim().includes(label)),
    )
    expect(target, 'style dropdown button').to.exist
    cy.wrap(target).click({ force: true })
  })
}

const selectStyle = (styleId) => {
  clickStyleDropdown()
  cy.wait(800)
  cy.get(`#${styleId}`).click({ force: true })
  closeOpenDropdown()
}

const loginAfterGenerate = () => {
  cy.get(SEL.loginWithEmailBtn, { timeout: 60000 })
    .should('be.visible')
    .click()
  cy.get(SEL.usernameInput).should('be.visible').type('memoslemi.sdstudio+1011@gmail.com')
  cy.get(SEL.passwordInput).type('12345678')
  cy.get(SEL.loginSubmitBtn).click()
  cy.wait(30000)
}

const openVSSidebar = () => {
  cy.contains('span.text-body-md.text-darkest', 'AI Virtual Staging')
    .closest('div.cursor-pointer.items-center.justify-between')
    .should('be.visible')
    .click()
}

const openVSRestagesSidebar = () => {
  cy.contains('span.text-body-md.text-darkest', 'AI Virtual Restaging')
    .closest('div.cursor-pointer.items-center.justify-between')
    .should('be.visible')
    .click()
}

describe('VS-flow-test', () => {
  it('completes VS flow: upload → gen-1 → download → feedback → bookmark → gen-2 → gen-3 → gen-4', () => {
    // ── 1. Visit site ─────────────────────────────────────────────────────────
    cy.visit('https://app.aihomedesign.com/')
    cy.wait(3000)

    // ── 1a. Dismiss onboarding modal (if shown) ───────────────────────────────
    dismissBlockingModals()

    // ── 2. Open VS uploader ───────────────────────────────────────────────────
    dismissBlockingModals()
    cy.get(SEL.vsCard).click({ force: true })

    // ── 3. Upload image ───────────────────────────────────────────────────────
    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/vs-test-room.jpg', { force: true })
    cy.wait(7000)

    // ── 4. Gen-1 config: Space = Studio ───────────────────────────────────────
    dismissBlockingModals()
    selectSpace('v5-tool-virtual-staging-space-studio', 5000)

    // ── 5. Gen-1 trigger + login ──────────────────────────────────────────────
    clickGenerate()
    loginAfterGenerate()

    // ── 6. Gen-1 result ─────────────────────────────────────────────────────────
    cy.get(SEL.resultThumbnail).first().should('be.visible').click()

    // ── 7. Download – Normal ────────────────────────────────────────────────────
    cy.get(SEL.downloadBtn).click()
    cy.get(SEL.normalDownloadBtn).click()
    cy.wait(10000)

    // ── 7b. Download – Upscale (commented out) ─────────────────────────────────
    cy.get(SEL.downloadBtn).click()
    cy.get('#v5-resultpage-downloadmodule-upscale-download').click()
    cy.get(SEL.normalDownloadBtn).click()
    cy.wait(25000)

    // ── 8. Feedback ─────────────────────────────────────────────────────────────
    cy.get(SEL.thumbUpBtn).closest('button').click()
    cy.get(SEL.moodBtn).closest('button').click()
    cy.get(SEL.feedbackDescription).type('The image is clear and the colors are accurate.')
    cy.get(SEL.feedbackSubmitBtn).contains('Submit').click()

    cy.contains(SEL.snackbar, 'Feedback submitted successfully.', { timeout: 10000 }).should(
      'be.visible',
    )
    cy.get(SEL.snackbar).should('not.exist')

    // ── 9. Bookmark ─────────────────────────────────────────────────────────────
    cy.get(SEL.bookmarkBtn).click()
    cy.contains(SEL.snackbar, /bookmark/i, { timeout: 10000 }).should('be.visible')
    cy.get(SEL.snackbar).should('not.exist')

    // ── 10. Gen-2: Living Room + Hampton ────────────────────────────────────────
    openVSSidebar()
    selectSpace('v5-tool-virtual-staging-space-living-room')
    selectStyle('v5-tool-virtual-staging-style-hampton')
    clickGenerate()
    cy.wait(30000)

    // ── 11. Gen-3: Living Room + Hampton + Remove Furniture ───────────────────
    openVSSidebar()
    selectSpace('v5-tool-virtual-staging-space-living-room')
    selectStyle('v5-tool-virtual-staging-style-hampton')
    cy.get(SEL.removeFurnitureToggle).click()
    clickRestageGenerate()
    cy.wait(30000)

    cy.get(':nth-child(9) > .relative > .size-20').click()

    // ── 12. Gen-4: Restaging / Living+Dining+Bedroom ───────────────────────────
    openVSRestagesSidebar()
    selectSpaceByAttr('v5-tool-virtual-restaging-space-living+dining+bedroom')
    clickRestageGenerate()
    cy.wait(30000)
  })
})
