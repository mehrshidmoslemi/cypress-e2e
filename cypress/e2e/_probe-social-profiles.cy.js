const { createProfileSettingsHelpers } = require('../support/profile-settings-shared')

const profile = createProfileSettingsHelpers('probe-social')

describe('probe social profiles', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  it('dumps social profiles fields', () => {
    profile.ensureLoggedIn('free')
    profile.openAccountSettings()
    profile.openSocialProfilesEditor()
    cy.wait(2000)

    cy.get('body').then(($body) => {
      const fields = [...$body.find('input, textarea')].map((el) => ({
        tag: el.tagName,
        name: el.getAttribute('name'),
        placeholder: el.getAttribute('placeholder'),
        type: el.getAttribute('type'),
        visible: Cypress.dom.isVisible(el),
      }))
      cy.writeFile('cypress/fixtures/probe-social-profiles-fields.json', fields)
    })
  })
})
