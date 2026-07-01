/**
 * Probe — Identity section edit form
 */

const { createProfileSettingsHelpers } = require('../support/profile-settings-shared')

const profile = createProfileSettingsHelpers('probe-identity')

describe('probe identity edit', () => {
  it('dumps identity edit form', () => {
    cy.on('uncaught:exception', () => false)
    profile.ensureLoggedIn('paidProPlus')
    profile.visitPrepared('/account/settings')
    cy.contains('p', /^Identity$/i).closest('.cursor-pointer').click({ force: true })
    cy.wait(2000)
    cy.get('body').then(($body) => {
      cy.writeFile(
        'cypress/fixtures/probe-profile-identity-edit.txt',
        $body.text().replace(/\s+/g, ' ').slice(0, 8000),
      )
      const fields = [...$body.find('input, textarea, button')].map((el) => ({
        tag: el.tagName,
        id: el.id,
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        placeholder: el.getAttribute('placeholder'),
        value: el.value?.slice?.(0, 80) || null,
        text: (el.textContent || '').trim().slice(0, 80),
        visible: Cypress.dom.isVisible(el),
      }))
      cy.writeFile(
        'cypress/fixtures/probe-profile-identity-edit-fields.json',
        fields.filter((f) => f.visible).slice(0, 50),
      )
    })
  })
})
