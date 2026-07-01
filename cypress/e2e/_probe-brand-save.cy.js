const { createProfileSettingsHelpers } = require('../support/profile-settings-shared')

const profile = createProfileSettingsHelpers('probe-brand-save')

describe('probe brand save', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  it('saves instagram url on social profiles', () => {
    profile.ensureLoggedIn('free')
    profile.openBrandCenter()
    profile.openSocialProfilesEditor()
    const testUrl = `https://instagram.com/e2e-probe-${Date.now()}`
    profile.addSocialProfileUrl(testUrl)
    profile.saveBrandInfo()
    profile.goBackToSettingsList()
    profile.openAccountSettings()
    profile.openSocialProfilesEditor()
    profile.assertSocialProfileUrlListed(testUrl.split('/').pop())
  })
})
