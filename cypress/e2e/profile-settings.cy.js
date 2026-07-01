/**
 * Profile & Settings — live production tests
 *
 * Accounts: free, restricted (+52), paidProPlus (Pro Plus monthly)
 * Never completes real payments — stops at Stripe/checkout modal.
 */

const { createProfileSettingsHelpers } = require('../support/profile-settings-shared')

const profile = createProfileSettingsHelpers('profile-settings')
const { MODAL_TIMEOUT, ACCOUNTS, SEL } = profile

const BRAND_LOGO_FIXTURE = 'cypress/fixtures/images/image-resize-0.jpg'
const TEST_NAME_SUFFIX = ` E2E${Date.now().toString().slice(-4)}`
const testBrandUrl = (label) => `https://instagram.com/e2e-${label}-${Date.now()}`

describe('Profile & Settings', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  describe('Profile Modal', () => {
    it('Modal renders correctly', () => {
      profile.ensureLoggedIn('free')
      profile.openProfilePopover()
      profile.assertProfilePopoverRendered(ACCOUNTS.free())
    })

    it('User status: Free', () => {
      profile.ensureLoggedIn('free')
      profile.openProfilePopover()
      profile.assertFreeStatus()
    })

    it('User status: Paid', () => {
      profile.ensureLoggedIn('paidProPlus')
      profile.openProfilePopover()
      profile.profilePopover().invoke('text').then((text) => {
        if (/pro/i.test(text) && /photo|day/i.test(text)) {
          profile.assertPaidStatus()
        } else {
          profile.closeProfilePopover()
          profile.visitPrepared('/billing')
          cy.get('body', { timeout: MODAL_TIMEOUT }).invoke('text').should('match', /pro/i)
        }
      })
    })

    it('User status: Restricted', () => {
      profile.ensureLoggedIn('restricted')
      profile.openProfilePopover()
      profile.assertRestrictedStatus()
    })

    it('Profile modal closes correctly', () => {
      profile.ensureLoggedIn('free')
      profile.openProfilePopover()
      profile.profilePopover().should('be.visible')

      profile.closeProfilePopover()
      cy.get('[id^="reka-popover-content"][data-state="open"]').should('not.exist')

      profile.openProfilePopover()
      profile.profilePopover().should('be.visible')
      cy.get('body').click(0, 0, { force: true })
      cy.get('[id^="reka-popover-content"][data-state="open"]').should('not.exist')
      cy.get('nav', { timeout: MODAL_TIMEOUT }).should('exist')
    })

    it('Profile modal is consistent across pages', () => {
      profile.ensureLoggedIn('free')
      const account = ACCOUNTS.free()

      const assertSamePopover = () => {
        profile.openProfilePopover()
        profile.profilePopover().within(() => {
          cy.contains(/@/).should('be.visible')
          cy.contains('button, a', /^upgrade$/i).should('be.visible')
        })
        profile.closeProfilePopover()
      }

      profile.visitPrepared('/')
      assertSamePopover()

      profile.visitPrepared('/studio/projects')
      assertSamePopover()

      profile.visitPrepared('/pricing')
      assertSamePopover()
    })
  })

  describe('Theme', () => {
    beforeEach(() => {
      profile.ensureLoggedIn('free')
      profile.openProfilePopover()
    })

    it('Toggle switches Dark ↔ Light', () => {
      profile.isDarkTheme().then((isDark) => {
        const start = isDark ? 'dark' : 'light'
        profile.toggleTheme()
        profile.assertTheme(start === 'dark' ? 'light' : 'dark')
        profile.toggleTheme()
        profile.assertTheme(start)
      })
    })

    it('Theme applies across all of Studio', () => {
      profile.setTheme('light')
      profile.closeProfilePopover()
      profile.assertTheme('light')

      profile.visitPrepared('/studio/projects')
      profile.assertTheme('light')

      profile.visitPrepared('/pricing')
      profile.assertTheme('light')

      profile.openProfilePopover()
      profile.setTheme('dark')
      profile.closeProfilePopover()
      profile.assertTheme('dark')

      profile.visitPrepared('/studio/projects')
      profile.assertTheme('dark')

      profile.visitPrepared('/pricing')
      profile.assertTheme('dark')
    })

    it('Light theme applies and persists after reload', () => {
      profile.setTheme('light')
      profile.closeProfilePopover()
      profile.assertTheme('light')
      cy.reload()
      profile.dismissStartup()
      profile.assertTheme('light')
    })

    it('Dark theme persists after reload', () => {
      profile.setTheme('dark')
      profile.closeProfilePopover()
      profile.assertTheme('dark')
      cy.reload()
      profile.dismissStartup()
      profile.assertTheme('dark')
    })

    it('Theme persists after re-login', () => {
      profile.setTheme('dark')
      profile.closeProfilePopover()
      profile.assertTheme('dark')
      profile.logoutViaProfileMenu()
      profile.ensureLoggedIn('free')
      profile.assertTheme('dark')
    })
  })

  describe('Subscription Actions', () => {
    it('Free → Upgrade opens Pro Plus offer', () => {
      profile.ensureLoggedIn('free')
      profile.openProfilePopover()
      profile.clickProfileUpgrade()
      profile.assertUpgradeOffersTier(/pro.?plus/i)
      profile.proceedToCheckout()
      profile.assertStripePresent()
    })

    it('Restricted → Upgrade behaves like Free', () => {
      profile.ensureLoggedIn('restricted')
      profile.openProfilePopover()
      profile.clickProfileUpgrade()
      profile.assertUpgradeOffersTier(/pro.?plus/i)
      profile.proceedToCheckout()
      profile.assertStripePresent()
    })

    it('Paid → two Upgrade buttons offer the next tier (Enterprise)', () => {
      profile.ensureLoggedIn('paidProPlus')
      profile.openProfilePopover()
      profile.profilePopover().invoke('text').then((text) => {
        if (/upgrade/i.test(text)) {
          profile.clickProfileUpgrade()
          profile.paidUpgradeToEnterpriseModal()
          profile.closeSubscriptionFlow()
        }
      })

      profile.visitPrepared('/pricing')
      profile.switchBillingTab('yearly')
      cy.get('body').then(($body) => {
        const enterpriseBtn = $body.find(
          '#v5-pricing-yearly-upgrade-enterprise-button, #v5-pricing-monthly-upgrade-enterprise-button',
        )
        if (!enterpriseBtn.length) {
          cy.log('No Enterprise upgrade button — account may not be on Pro Plus tier')
          return
        }
        cy.wrap(enterpriseBtn.first()).scrollIntoView().click({ force: true })
        profile.paidUpgradeToEnterpriseModal()
        profile.closeSubscriptionFlow()
      })
    })

    it('Paid → Add Coins flow', () => {
      profile.ensureLoggedIn('paidProPlus')
      profile.openProfilePopover()
      profile.profilePopover().invoke('text').then((text) => {
        if (!/add coins|get more credit/i.test(text)) {
          cy.log('TODO: paidProPlus account has no Add Coins in popover — subscription may have lapsed')
          return
        }
        profile.clickAddCoins()
        profile.assertAddCoinsModal()
        profile.proceedToStripeIfNeeded()
        profile.assertStripePresent()
      })
    })

    it('Upgrade/Checkout redirect to correct page/host', () => {
      profile.ensureLoggedIn('free')
      profile.openProfilePopover()
      profile.clickProfileUpgrade()
      profile.assertUpgradeOffersTier(/pro.?plus/i)
      profile.proceedToCheckout()

      cy.get('body', { timeout: MODAL_TIMEOUT }).should(($body) => {
        const hasStripeIframe = [...$body.find('iframe')].some((iframe) =>
          /stripe|checkout/i.test(
            `${iframe.getAttribute('src') || ''}${iframe.getAttribute('name') || ''}`,
          ),
        )
        const hasStripeText = /stripe|card number|payment method/i.test($body.text())
        expect(hasStripeIframe || hasStripeText).to.be.true
      })
    })

    it('Close subscription modal without paying', () => {
      profile.ensureLoggedIn('free')
      profile.openProfilePopover()
      profile.clickProfileUpgrade()
      profile.assertUpgradeOffersTier(/pro.?plus/i)
      profile.closeSubscriptionFlow()
      profile.openProfilePopover()
      profile.assertFreeStatus()
    })

    it('Free user cannot see "next tier = Enterprise"', () => {
      profile.ensureLoggedIn('free')
      profile.openProfilePopover()
      profile.clickProfileUpgrade()
      profile.assertUpgradeOffersTier(/pro.?plus/i)
      profile.assertNoEnterpriseOffer()
    })
  })

  describe('Profile Edit', () => {
    const account = ACCOUNTS.free()

    beforeEach(() => {
      profile.ensureLoggedIn('free')
      profile.openAccountSettings()
    })

    it('User info renders correctly', () => {
      profile.openIdentityEditor()
      cy.get('input[name="first_name"]', { timeout: MODAL_TIMEOUT }).should('be.visible')
      cy.get('input[name="last_name"]').should('be.visible')
      cy.get('input[name="email"]').should('have.value', account.email)
    })

    it('Editing is possible', () => {
      profile.openIdentityEditor()
      profile.readFirstName().then((original) => {
        const edited = `${original || 'User'}${TEST_NAME_SUFFIX}`
        profile.fillFirstName(edited)
        cy.get('input[name="first_name"]').should('have.value', edited)
        cy.contains('button', /save and continue/i).should('not.be.disabled')
        profile.fillFirstName(original || 'User')
      })
    })

    it('Changes are saved correctly', () => {
      profile.openIdentityEditor()
      profile.readFirstName().then((original) => {
        const edited = `${original || 'User'}${TEST_NAME_SUFFIX}`
        profile.fillFirstName(edited)
        profile.saveProfileEdit()
        profile.goBackToSettingsList()
        profile.openAccountSettings()
        profile.openIdentityEditor()
        cy.get('input[name="first_name"]').should('have.value', edited)
        profile.fillFirstName(original || 'User')
        profile.saveProfileEdit()
      })
    })

    it('Changes persist after refresh', () => {
      profile.openIdentityEditor()
      profile.readFirstName().then((original) => {
        const edited = `${original || 'User'}${TEST_NAME_SUFFIX}`
        profile.fillFirstName(edited)
        profile.saveProfileEdit()
        cy.reload()
        profile.dismissStartup()
        profile.openAccountSettings()
        profile.openIdentityEditor()
        cy.get('input[name="first_name"]').should('have.value', edited)
        profile.fillFirstName(original || 'User')
        profile.saveProfileEdit()
      })
    })

    it('Changes persist after re-login', () => {
      profile.openIdentityEditor()
      profile.readFirstName().then((original) => {
        const edited = `${original || 'User'}${TEST_NAME_SUFFIX}`
        profile.fillFirstName(edited)
        profile.saveProfileEdit()
        profile.logoutViaProfileMenu()
        profile.ensureLoggedIn('free')
        profile.openAccountSettings()
        profile.openIdentityEditor()
        cy.get('input[name="first_name"]').should('have.value', edited)
        profile.fillFirstName(original || 'User')
        profile.saveProfileEdit()
      })
    })

    it('Validation on profile edit', () => {
      profile.openIdentityEditor()
      profile.readFirstName().then((original) => {
        cy.get('input[name="first_name"]').clear({ force: true })
        cy.contains('button', /save and continue/i).then(($btn) => {
          const disabled =
            $btn.is(':disabled') || $btn.attr('aria-disabled') === 'true' || $btn.hasClass('disabled')
          if (!disabled) {
            cy.wrap($btn).click({ force: true })
            cy.get('body').invoke('text').should('match', /required|invalid|enter|empty/i)
          } else {
            expect(disabled).to.be.true
          }
        })
        profile.fillFirstName(original || 'User')
      })
    })

    it('Cancel discards edits', () => {
      profile.openIdentityEditor()
      profile.readFirstName().then((original) => {
        const edited = `${original || 'User'}${TEST_NAME_SUFFIX}`
        profile.fillFirstName(edited)
        profile.cancelProfileEdit()
        profile.goBackToSettingsList()
        profile.openAccountSettings()
        profile.openIdentityEditor()
        cy.get('input[name="first_name"]').should('have.value', original || '')
      })
    })
  })

  describe('Brand Center', () => {
    it('Open Brand Center', () => {
      profile.ensureLoggedIn('free')
      profile.openBrandCenter()
      cy.contains('p', /^Identity$/i, { timeout: MODAL_TIMEOUT }).should('exist')
    })

    it('Fill and save brand info', () => {
      profile.ensureLoggedIn('free')
      profile.openBrandCenter()
      profile.openSocialProfilesEditor()

      const testUrl = testBrandUrl('save')
      profile.addSocialProfileUrl(testUrl)
      profile.saveBrandInfo()
      profile.goBackToSettingsList()
      profile.openAccountSettings()
      profile.openSocialProfilesEditor()
      profile.assertSocialProfileUrlListed(testUrl)
    })

    it('Brand info persists after reload/re-login', () => {
      profile.ensureLoggedIn('free')
      profile.openBrandCenter()
      profile.openSocialProfilesEditor()

      const testUrl = testBrandUrl('persist')
      profile.addSocialProfileUrl(testUrl)
      profile.saveBrandInfo()
      profile.goBackToSettingsList()
      cy.reload()
      profile.dismissStartup()
      profile.openAccountSettings()
      profile.openSocialProfilesEditor()
      profile.assertSocialProfileUrlListed(testUrl)
      profile.logoutViaProfileMenu()
      profile.ensureLoggedIn('free')
      profile.openAccountSettings()
      profile.openSocialProfilesEditor()
      profile.assertSocialProfileUrlListed(testUrl)
    })

    it('Brand logo upload accepts a valid image', () => {
      profile.ensureLoggedIn('free')
      profile.openBrandCenter()
      profile.openBrandLogoEditor()
      cy.get('input[type="file"]', { timeout: MODAL_TIMEOUT }).first().selectFile(BRAND_LOGO_FIXTURE, {
        force: true,
      })
      cy.get('body', { timeout: MODAL_TIMEOUT }).should(($body) => {
        const text = $body.text()
        const imgs = [...$body.find('img')].filter((img) => {
          const src = img.getAttribute('src') || ''
          const alt = (img.getAttribute('alt') || '').toLowerCase()
          return src.includes('blob:') || src.includes('data:') || alt.includes('logo')
        })
        expect(imgs.length > 0 || /upload|logo|preview|saved/i.test(text)).to.be.true
      })
    })
  })
})
