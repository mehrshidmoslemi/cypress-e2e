const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const flow = createEnhancedFlowHelpers({ sel: COMMON_SEL, sessionId: 'probe-cp-v3' })
const PAID = { email: 'memoslemi.sdstudio+10000@gmail.com', password: '12345678' }

const loginFresh = () => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.visit('/')
  flow.prepareSiteForTesting()
  cy.contains('span', 'Login', { timeout: 60000 }).click({ force: true })
  cy.contains('button', 'Login', { timeout: 30000 }).click({ force: true })
  cy.get('#login-with-email-button').click({ force: true })
  cy.get('input[name="username"]').clear().type(PAID.email)
  cy.get('input[name="password"]').clear().type(PAID.password, { log: false })
  cy.get('#loginwithemail-login-button').click({ force: true })
  cy.get('nav [aria-haspopup="dialog"].rounded-full', { timeout: 90000 }).should('be.visible')
  cy.get('nav').contains(/^Login$/).should('not.exist')
  flow.completeOnboardingIfShown()
  flow.prepareSiteForTesting()
}

describe('probe create project v3', () => {
  it.only('capture modal after fresh login', () => {
    loginFresh()
    cy.visit('/studio/projects')
    flow.prepareSiteForTesting()
    flow.completeOnboardingIfShown()
    cy.get('nav').contains(/^Login$/).should('not.exist')

    cy.contains('button', 'Create Project', { timeout: 30000 }).scrollIntoView().click({ force: true })
    cy.wait(3000)

    cy.get('body').invoke('text').then((t) => cy.writeFile('cypress/fixtures/probe-cp-v3-body.txt', t.slice(0, 10000)))

    cy.document().then((doc) => {
      const dialogs = [...doc.querySelectorAll('[role="dialog"]')].map((d) => ({
        text: d.textContent.slice(0, 1200),
        buttons: [...d.querySelectorAll('button, a, [role="button"]')]
          .filter((el) => Cypress.dom.isVisible(el))
          .map((el) => (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 100)),
        inputs: [...d.querySelectorAll('input')].map((el) => ({
          type: el.type,
          placeholder: el.placeholder,
          visible: Cypress.dom.isVisible(el),
        })),
      }))
      cy.writeFile('cypress/fixtures/probe-cp-v3-dialogs.json', dialogs)
    })
  })
})
