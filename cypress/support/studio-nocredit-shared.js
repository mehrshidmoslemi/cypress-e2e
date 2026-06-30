/**
 * Studio — nocredit account: generate on existing photo, upload limit modal
 *
 * Account: memoslemi.sdstudio+nocredit@gmail.com / 12345678
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('./flow-enhanced-shared')
const { createStudioResultsHelpers } = require('./studio-results-shared')
const { dismissBlockingModals } = require('./signup-shared')

const UPLOAD_IMAGE = 'cypress/fixtures/images/vs-test-room.jpg'
const GEN_TIMEOUT = 240000
const MODAL_TIMEOUT = 60000

const SEL = {
  ...COMMON_SEL,
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-virtual-staging-generate-button',
  spaceStudio: '#v5-tool-virtual-staging-space-studio',
}

const getAccount = () => ({
  email: Cypress.env('STUDIO_NOCREDIT_EMAIL') || 'memoslemi.sdstudio+nocredit@gmail.com',
  password: Cypress.env('STUDIO_NOCREDIT_PASSWORD') || '12345678',
})

function createStudioNocreditHelpers(sessionId = 'studio-nocredit') {
  const flow = createEnhancedFlowHelpers({ sel: SEL, sessionId })
  const results = createStudioResultsHelpers(sessionId)

  const dismissStartup = () => {
    cy.get('body').then(($body) => {
      if ($body.text().includes('Accept all')) {
        cy.contains('button', 'Accept all').click({ force: true })
      }
    })

    cy.get('body').then(($body) => {
      if (!$body.text().includes('Which best describes you?')) {
        return
      }

      cy.get('[role="dialog"]:visible').then(($dialog) => {
        if ($dialog.text().includes('Other')) {
          cy.wrap($dialog).contains('Other').click({ force: true })
        }
      })

      cy.get('body', { timeout: 30000 }).then(($body2) => {
        if ($body2.text().includes('What are you trying to do today?')) {
          cy.contains('Just testing AIHomeDesign').click({ force: true })
          cy.contains("I'll explore on my own").click({ force: true })
        } else if ($body2.text().includes('Which best describes you?')) {
          cy.get('button[aria-label="Close"]').click({ force: true })
        }
      })
    })
  }

  const loginWithEmail = () => {
    const account = getAccount()

    cy.contains('span', 'Login').click({ force: true })
    cy.contains('button', 'Login').click({ force: true })
    cy.get('#login-with-email-button').click({ force: true })
    cy.get('input[name="username"]').clear().type(account.email)
    cy.get('input[name="password"]').clear().type(account.password, { log: false })
    cy.get('#loginwithemail-login-button').click({ force: true })

    cy.get('body', { timeout: 90000 }).should(($body) => {
      const navLogin = [...$body.find('nav span, nav button, nav a')].some(
        (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
      )
      expect(navLogin, `should be logged in as ${account.email}`).to.be.false
    })
  }

  const ensureLoggedIn = () => {
    const account = getAccount()

    cy.session(
      `${sessionId}:${account.email}`,
      () => {
        cy.clearCookies()
        cy.visit('/')
        dismissBlockingModals()
        loginWithEmail()
        dismissStartup()
      },
      {
        validate() {
          cy.visit('/')
          cy.get('nav', { timeout: 60000 }).should('exist')
          cy.get('body').should(($body) => {
            const navLogin = [...$body.find('nav span, nav button, nav a')].some(
              (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
            )
            expect(navLogin).to.be.false
          })
        },
      },
    )

    cy.visit('/')
    dismissStartup()
  }

  const goToStudio = () => {
    results.studio.visitStudioProjectsWithRetry()
    dismissStartup()
    results.studio.waitForSingleFilesReady()
  }

  const openExistingPhotoWithResults = () => {
    goToStudio()
    results.openSingleFileWithResults()
    results.assertResultPageReady()
  }

  const openVirtualStagingTool = () => {
    cy.get('body').then(($body) => {
      if (/upload new photo/i.test($body.text())) {
        cy.contains(/AI Virtual Staging/i).click({ force: true })
      }
    })
  }

  const runVirtualStagingGenerate = () => {
    openVirtualStagingTool()
    flow.selectSpace(SEL.spaceStudio)
    flow.clickGenerate(SEL.generateBtn)
  }

  const ensureResultSidebarVisible = () => {
    cy.get('body').then(($body) => {
      if (!/upload new photo/i.test($body.text())) {
        cy.contains('button, a, span', /^Back$/i).first().click({ force: true })
      }
    })
    cy.contains(/upload new photo/i, { timeout: 30000 }).should('be.visible')
  }

  const generateOnExistingPhoto = () => {
    runVirtualStagingGenerate()
    cy.contains('button', /^Download$/i, { timeout: GEN_TIMEOUT }).should('be.visible')
    ensureResultSidebarVisible()
  }

  const openUploadNewPhotoPanel = () => {
    ensureResultSidebarVisible()
    cy.contains(/upload new photo/i).click({ force: true })
    cy.contains('Upload Assets', { timeout: 30000 }).should('be.visible')
  }

  const uploadNewPhoto = () => {
    openUploadNewPhotoPanel()
    results.uploadNewPhotoInPanel()
    cy.get('body').type('{esc}', { force: true })
    results.assertResultPageReady()
  }

  const attemptGenerateOnNewPhoto = () => {
    runVirtualStagingGenerate()
  }

  const assertMoreInputsModalVisible = () => {
    cy.contains(/Ready for More Inputs\?/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
    cy.contains(/Get More Photos/i).should('be.visible')
    cy.contains(/Upgrade to a plan with more photos/i).should('be.visible')
    cy.contains(/Stay on your current plan and purchase additional photos/i).should('be.visible')
  }

  const clickGetMorePhotosAndAssertCoinBuyModal = () => {
    cy.contains(/Get More Photos/i).click({ force: true })
    cy.contains(/Get More Photos/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
    cy.contains(/per photo/i).should('be.visible')
    cy.contains('button', /^Checkout$/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const closeTopModal = () => {
    cy.get('body').type('{esc}', { force: true })
  }

  const clickUpgradeAndAssertPricing = () => {
    cy.contains(/Upgrade to a plan with more photos/i).click({ force: true })
    cy.url({ timeout: 60000 }).should('include', '/pricing')
    cy.get('body', { timeout: 30000 }).should(($body) => {
      expect($body.text()).to.match(/pricing|plan|subscribe|upgrade/i)
    })
  }

  return {
    flow,
    results,
    UPLOAD_IMAGE,
    getAccount,
    ensureLoggedIn,
    dismissStartup,
    goToStudio,
    openExistingPhotoWithResults,
    generateOnExistingPhoto,
    uploadNewPhoto,
    attemptGenerateOnNewPhoto,
    assertMoreInputsModalVisible,
    clickGetMorePhotosAndAssertCoinBuyModal,
    closeTopModal,
    clickUpgradeAndAssertPricing,
    ensureResultSidebarVisible,
  }
}

module.exports = {
  createStudioNocreditHelpers,
  UPLOAD_IMAGE,
}
