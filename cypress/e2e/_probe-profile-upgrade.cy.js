const { createProfileSettingsHelpers } = require('../support/profile-settings-shared')

const profile = createProfileSettingsHelpers('probe-upgrade')

describe('probe upgrade flow', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  it('dumps free popover before and after upgrade click', () => {
    profile.ensureLoggedIn('free')
    profile.openProfilePopover()

    profile.profilePopover().then(($pop) => {
      cy.writeFile('cypress/fixtures/probe-profile.html', $pop[0].outerHTML.slice(0, 120000))
      cy.writeFile(
        'cypress/fixtures/probe-profile-free-before-upgrade.txt',
        ($pop[0].textContent || '').replace(/\s+/g, ' '),
      )
    })

    profile.upgradeButtonInPopover().click({ force: true })

    cy.wait(3000)

    cy.get('[role="dialog"]:visible').then(($dialogs) => {
      const dump = [...$dialogs].map((el, i) => `[${i}] ${(el.textContent || '').replace(/\s+/g, ' ').slice(0, 500)}`)
      cy.writeFile('cypress/fixtures/probe-profile-after-upgrade.txt', dump.join('\n\n'))
    })

    cy.get('body').then(($body) => {
      cy.writeFile(
        'cypress/fixtures/probe-profile-after-upgrade-body.txt',
        ($body.text() || '').replace(/\s+/g, ' ').slice(0, 3000),
      )
    })
  })

  it('dumps paidProPlus popover', () => {
    profile.ensureLoggedIn('paidProPlus')
    profile.openProfilePopover()

    profile.profilePopover().then(($pop) => {
      cy.writeFile(
        'cypress/fixtures/probe-profile-paid-popover.txt',
        ($pop[0].textContent || '').replace(/\s+/g, ' '),
      )
    })
  })
})
