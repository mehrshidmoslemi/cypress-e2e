/**
 * Probe — profile edit Name section flow
 */

const { createProfileSettingsHelpers } = require('../support/profile-settings-shared')

const profile = createProfileSettingsHelpers('probe-name-edit')

describe('probe profile name edit', () => {
  it('dumps name edit dialog', () => {
    cy.on('uncaught:exception', () => false)
    profile.ensureLoggedIn('paidProPlus')
    profile.visitPrepared('/account/settings')
    cy.contains(/name/i).first().click({ force: true })
    cy.wait(1500)
    cy.get('body').then(($body) => {
      cy.writeFile(
        'cypress/fixtures/probe-profile-name-edit.txt',
        $body.text().replace(/\s+/g, ' ').slice(0, 8000),
      )
      const fields = [...$body.find('input, textarea, button')].map((el) => ({
        tag: el.tagName,
        id: el.id,
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        text: (el.textContent || '').trim().slice(0, 80),
        visible: Cypress.dom.isVisible(el),
      }))
      cy.writeFile('cypress/fixtures/probe-profile-name-edit-fields.json', fields.filter((f) => f.visible).slice(0, 40))
    })
  })
})
