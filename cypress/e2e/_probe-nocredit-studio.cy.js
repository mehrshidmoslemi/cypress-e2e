const { createStudioResultsHelpers } = require('../support/studio-results-shared')

const ACCOUNT = { email: 'memoslemi.sdstudio+nocredit@gmail.com', password: '12345678' }
const dump = (n, d) => cy.writeFile(`cypress/fixtures/${n}`, d)

const loginNocredit = () => {
  cy.clearCookies()
  cy.visit('/')
  cy.get('nav', { timeout: 60000 }).should('exist')
  cy.contains('span', 'Login').click({ force: true })
  cy.contains('button', 'Login').click({ force: true })
  cy.get('#login-with-email-button').click({ force: true })
  cy.get('input[name="username"]').clear().type(ACCOUNT.email)
  cy.get('input[name="password"]').clear().type(ACCOUNT.password, { log: false })
  cy.get('#loginwithemail-login-button').click({ force: true })
  cy.get('nav [aria-haspopup="dialog"].rounded-full', { timeout: 90000 }).should('be.visible')
}

describe('probe nocredit studio', () => {
  it('probes generate flows', () => {
    loginNocredit()

    const results = createStudioResultsHelpers('probe-nocredit')
    results.studio.visitStudioProjectsWithRetry()
    results.studio.waitForSingleFilesReady()

    cy.get('body').then(($body) => {
      dump('probe-nocredit-studio-body.txt', ($body.text() || '').slice(0, 6000))
      const cards = [...$body.find('div.rounded-2xl.cursor-pointer')]
      dump(
        'probe-nocredit-cards.json',
        cards.map((c) => ({
          text: (c.textContent || '').trim().slice(0, 120),
          hasImg: c.querySelector('img[src*="cdn.aihomedesign.com"]') != null,
        })),
      )
    })

    results.openSingleFileWithResults()

    cy.contains('button', /^AI Virtual Staging$/i).click({ force: true })
    cy.get('#v5-tool-virtual-staging-generate-button', { timeout: 30000 }).click({ force: true })
    cy.contains('button', /^Download$/i, { timeout: 240000 }).should('be.visible')

    cy.get('body').then(($body) => {
      dump('probe-nocredit-after-existing-gen.txt', ($body.text() || '').slice(0, 8000))
    })

    results.openUploadNewPhotoPanel()
    results.uploadNewPhotoInPanel()
    cy.get('body').type('{esc}', { force: true })

    cy.contains('button', /^AI Virtual Staging$/i).click({ force: true })
    cy.get('#v5-tool-virtual-staging-generate-button').click({ force: true })

    cy.get('[role="dialog"]:visible', { timeout: 60000 }).should('be.visible')
    cy.get('body').then(($body) => {
      dump('probe-nocredit-after-new-upload-gen.txt', ($body.text() || '').slice(0, 12000))
      const buttons = [...$body.find('button')].map((el) => ({
        text: (el.textContent || '').trim(),
        visible: Cypress.dom.isVisible(el),
      }))
      dump('probe-nocredit-modal-buttons.json', buttons.filter((b) => b.visible && b.text))
    })
  })
})
