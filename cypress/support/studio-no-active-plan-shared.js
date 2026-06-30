/**
 * Studio — expired/no-plan account: regenerate blocked, See Plans → pricing
 *
 * Account: memoslemi.sdstudio+52@gmail.com / mmmmmmmm
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('./flow-enhanced-shared')
const { createStudioResultsHelpers } = require('./studio-results-shared')
const { dismissBlockingModals } = require('./signup-shared')

const MODAL_TIMEOUT = 60000

const SEL = {
  ...COMMON_SEL,
  generateBtn: '#v5-tool-virtual-staging-generate-button',
  spaceStudio: '#v5-tool-virtual-staging-space-studio',
}

const getAccount = () => ({
  email: Cypress.env('STUDIO_NO_PLAN_EMAIL') || 'memoslemi.sdstudio+52@gmail.com',
  password: Cypress.env('STUDIO_NO_PLAN_PASSWORD') || 'mmmmmmmm',
})

function createStudioNoActivePlanHelpers(sessionId = 'studio-no-active-plan') {
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
    cy.intercept('GET', '**/v3/order**').as('studioOrders')
    cy.intercept('GET', '**/v3/project**').as('studioProjects')

    results.studio.visitStudioProjectsWithRetry()
    dismissStartup()
    cy.wait(['@studioOrders', '@studioProjects'], { timeout: 120000 })
    results.studio.waitForSingleFilesReady()
  }

  const openPreviousResult = () => {
    goToStudio()
    results.openSingleFileWithResults()
    results.assertResultPageReady()
    cy.contains('button', /^Download$/i).should('be.visible')
  }

  const openVirtualStagingFromResult = () => {
    cy.get('body').then(($body) => {
      if (/upload new photo/i.test($body.text())) {
        cy.contains(/AI Virtual Staging/i).click({ force: true })
      }
    })
  }

  const attemptRegenerate = () => {
    openVirtualStagingFromResult()
    flow.selectSpace(SEL.spaceStudio)
    flow.clickGenerate(SEL.generateBtn)
    cy.contains(/no active plan/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const noActivePlanModal = () =>
    cy.contains(/no active plan/i, { timeout: MODAL_TIMEOUT }).closest('.fixed, [role="dialog"]')

  const assertNoActivePlanModalVisible = () => {
    cy.contains(/no active plan/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
    cy.contains(/subscribe to a plan to keep generating/i).should('be.visible')
    noActivePlanModal().contains(/Cancel/i).should('be.visible')
    noActivePlanModal().contains(/See Plans/i).should('be.visible')
  }

  const clickSeePlansAndAssertPricing = () => {
    noActivePlanModal().contains(/See Plans/i).click({ force: true })
    cy.url({ timeout: 60000 }).should('include', '/pricing')
    cy.get('body', { timeout: 30000 }).should(($body) => {
      expect($body.text()).to.match(/pricing|plan|subscribe|upgrade/i)
    })
  }

  return {
    flow,
    results,
    getAccount,
    ensureLoggedIn,
    goToStudio,
    openPreviousResult,
    attemptRegenerate,
    assertNoActivePlanModalVisible,
    clickSeePlansAndAssertPricing,
  }
}

module.exports = {
  createStudioNoActivePlanHelpers,
}
