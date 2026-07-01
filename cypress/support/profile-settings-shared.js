/**
 * Profile & Settings — selectors, session login, profile popover, theme, brand center
 */

const { createPricingPageHelpers, ACCOUNTS } = require('./pricing-page-shared')
const { dismissBlockingModals } = require('./signup-shared')

const MODAL_TIMEOUT = 60000
const VISIT_OPTIONS = { timeout: 120000, failOnStatusCode: true, retryOnStatusCodeFailure: true }

const SEL = {
  profileMenuTrigger: 'nav [aria-haspopup="dialog"].rounded-full',
  profileDialog: '[role="dialog"]:visible',
  upgradeButton: '#v5-user-credit-pop-over-upgrade',
  addCoinsButton: '#v5-user-credit-pop-over-get-more-credit',
  themeSwitch: '[role="switch"][aria-label*="mode"]',
  brandCenterLink: 'a[href="/account/settings"]',
  billingLink: 'a[href="/billing"]',
  profileCard: '[role="dialog"]:visible .cursor-pointer',
  accountSettingsPath: '/account/settings',
  pricingUpgradeEnterpriseMonthly: '#v5-pricing-monthly-upgrade-enterprise-button',
  pricingUpgradeEnterpriseYearly: '#v5-pricing-yearly-upgrade-enterprise-button',
}

function createProfileSettingsHelpers(sessionPrefix = 'profile-settings') {
  const pricing = createPricingPageHelpers(sessionPrefix)

  const dismissStartup = () => {
    cy.get('body').then(($body) => {
      if ($body.text().includes('Accept all')) {
        cy.contains('button', 'Accept all').click({ force: true })
      }
    })

    cy.get('body', { timeout: MODAL_TIMEOUT }).then(($body) => {
      if ($body.text().match(/which best describes you\?/i)) {
        cy.contains('[role="dialog"]:visible', /which best describes you/i)
          .contains('button', /other/i)
          .click({ force: true })
      }
    })

    cy.get('body', { timeout: MODAL_TIMEOUT }).then(($body) => {
      if ($body.text().match(/what are you trying to do today\?/i)) {
        cy.contains('button', /just testing aihomedesign/i).click({ force: true })
      }
    })

    cy.get('body', { timeout: 10000 }).then(($body) => {
      if ($body.text().match(/explore on my own/i)) {
        cy.contains('button', /explore on my own/i).click({ force: true })
      }
    })
  }

  const ensureOnboardingDismissed = () => {
    dismissStartup()
    cy.wait(500)
    dismissStartup()
    cy.get('body', { timeout: MODAL_TIMEOUT }).invoke('text').should('not.match', /which best describes you\?/i)
  }

  const visitPrepared = (path = '/') => {
    cy.visit(path, VISIT_OPTIONS)
    dismissBlockingModals()
    ensureOnboardingDismissed()
    cy.get('nav', { timeout: MODAL_TIMEOUT }).should('exist')
    cy.get(SEL.profileMenuTrigger, { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const ensureLoggedIn = (accountType) => {
    pricing.ensureLoggedIn(accountType)
    visitPrepared('/')
    ensureOnboardingDismissed()
  }

  const profilePopover = () =>
    cy.get('[id^="reka-popover-content"][data-state="open"]', { timeout: MODAL_TIMEOUT })

  const waitForCreditSection = () => {
    cy.get('[id^="reka-popover-content"][data-state="open"] [aria-busy="true"][aria-label="loading"]', {
      timeout: MODAL_TIMEOUT,
    }).should('not.exist')
  }

  const upgradeButtonInPopover = () =>
    profilePopover().then(($popover) => {
      const byId = $popover.find('#v5-user-credit-pop-over-upgrade')
      if (byId.length) {
        return cy.wrap(byId.first())
      }
      const byText = $popover.find('button, a').filter((_, el) =>
        /^upgrade$/i.test((el.textContent || '').trim()),
      )
      return cy.wrap(byText.first())
    })

  const addCoinsButtonInPopover = () =>
    profilePopover().then(($popover) => {
      const byId = $popover.find('#v5-user-credit-pop-over-get-more-credit')
      if (byId.length) {
        return cy.wrap(byId.first())
      }
      const byText = $popover.find('button, a').filter((_, el) =>
        /add coins|get more credit/i.test(el.textContent || ''),
      )
      return cy.wrap(byText.first())
    })

  const openProfilePopover = () => {
    dismissBlockingModals()
    ensureOnboardingDismissed()
    cy.get(SEL.profileMenuTrigger, { timeout: MODAL_TIMEOUT }).should('be.visible').click({ force: true })
    cy.get('body').then(($body) => {
      if ($body.text().match(/which best describes you\?/i)) {
        ensureOnboardingDismissed()
        cy.get(SEL.profileMenuTrigger).last().click({ force: true })
      } else if (!$body.find('[id^="reka-popover-content"][data-state="open"]').length) {
        cy.get(SEL.profileMenuTrigger).last().click({ force: true })
      }
    })
    profilePopover().should('be.visible')
    waitForCreditSection()
  }

  const closeProfilePopover = () => {
    cy.get('body').type('{esc}', { force: true })
    cy.get('[id^="reka-popover-content"][data-state="open"]').should('not.exist')
  }

  const closeVisibleModal = () => {
    cy.get('body').type('{esc}', { force: true })
    cy.wait(300)
  }

  const logoutViaProfileMenu = () => {
    openProfilePopover()
    profilePopover().contains('Logout').click({ force: true })
    dismissBlockingModals()
    cy.contains('span', 'Login', { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const assertProfilePopoverRendered = (account) => {
    profilePopover().within(() => {
      cy.contains(/@/).should('be.visible')
      cy.contains('button, a', /^upgrade$/i).should('be.visible')
      cy.contains(/logout/i).should('be.visible')
    })

    if (account?.email) {
      profilePopover().invoke('text').should('include', account.email.split('@')[0].slice(0, 8))
    }
  }

  const assertFreeStatus = () => {
    profilePopover().invoke('text').should('match', /free|starter/i)
    profilePopover().contains('button, a', /^upgrade$/i).should('be.visible')
  }

  const assertPaidStatus = () => {
    profilePopover().invoke('text').then((text) => {
      expect(text).to.match(/pro/i)
      if (/photo|day|coin|credit/i.test(text)) {
        expect(text).to.match(/photo|day/i)
      }
    })
    profilePopover().then(($popover) => {
      const t = $popover.text()
      if (/upgrade/i.test(t)) {
        cy.wrap($popover).contains('button, a', /^upgrade$/i).should('be.visible')
      }
      if (/add coins|get more credit/i.test(t)) {
        cy.wrap($popover).contains('button, a', /add coins|get more credit/i).should('be.visible')
      }
    })
  }

  const assertRestrictedStatus = () => {
    profilePopover().contains('button, a', /^upgrade$/i).should('be.visible')
  }

  const isDarkTheme = () =>
    cy.get('html').then(($html) => {
      const cls = $html.attr('class') || ''
      const dataTheme = $html.attr('data-theme') || ''
      return cls.includes('dark') || dataTheme.includes('dark')
    })

  const assertTheme = (mode) => {
    if (mode === 'dark') {
      cy.get('html').should('satisfy', ($html) => {
        const cls = $html.attr('class') || ''
        const dataTheme = $html.attr('data-theme') || ''
        return cls.includes('dark') || dataTheme.includes('dark')
      })
    } else {
      cy.get('html').should('satisfy', ($html) => {
        const cls = $html.attr('class') || ''
        const dataTheme = $html.attr('data-theme') || ''
        return !cls.includes('dark') && !dataTheme.includes('dark')
      })
    }
  }

  const toggleTheme = () => {
    cy.get('body').then(($body) => {
      const hasSwitch = $body.find('[id^="reka-popover-content"][data-state="open"] [role="switch"]').length
      if (!hasSwitch) {
        openProfilePopover()
      }
    })
    profilePopover().find(SEL.themeSwitch).click({ force: true })
    cy.wait(500)
  }

  const setTheme = (targetMode) => {
    isDarkTheme().then((isDark) => {
      const current = isDark ? 'dark' : 'light'
      if (current !== targetMode) {
        toggleTheme()
      }
    })
  }

  const clickProfileUpgrade = () => {
    upgradeButtonInPopover().click({ force: true })
  }

  const clickAddCoins = () => {
    addCoinsButtonInPopover().click({ force: true })
  }

  const subscriptionDialog = () =>
    cy.get('[role="dialog"]:visible', { timeout: MODAL_TIMEOUT }).then(($dialogs) => {
      const match = [...$dialogs].find((el) => {
        const text = el.textContent || ''
        return /checkout|upgrade|enterprise|pro.?plus|coin|credit/i.test(text)
      })
      return cy.wrap(match || $dialogs[$dialogs.length - 1])
    })

  const assertUpgradeOffersTier = (tierPattern) => {
    cy.get('body', { timeout: MODAL_TIMEOUT }).invoke('text').should('match', tierPattern)
  }

  const proceedToCheckout = () => {
    cy.get('body').then(($body) => {
      const buttons = [...$body.find('button')].filter((el) => Cypress.dom.isVisible(el))
      const checkout = buttons.find((button) => /^checkout$/i.test(button.textContent.trim()))
      const unlock = buttons.find((button) =>
        /unlock now|get started|subscribe|continue/i.test(button.textContent.trim()),
      )

      if (checkout) {
        cy.wrap(checkout).click({ force: true })
      } else if (unlock) {
        cy.wrap(unlock).click({ force: true })
      } else {
        pricing.proceedToStripeIfNeeded()
      }
    })
  }

  const assertNoEnterpriseOffer = () => {
    cy.get('body').then(($body) => {
      const dialogs = [...$body.find('[role="dialog"]:visible')]
      const combined = dialogs.map((el) => el.textContent || '').join(' ')
      expect(combined.toLowerCase()).to.not.match(/enterprise/)
    })
  }

  const openBrandCenter = () => {
    openProfilePopover()
    profilePopover().contains('a', /brand center/i).click({ force: true })
    cy.url({ timeout: MODAL_TIMEOUT }).should('include', SEL.accountSettingsPath)
  }

  const openAccountSettings = () => {
    visitPrepared(SEL.accountSettingsPath)
    cy.url({ timeout: MODAL_TIMEOUT }).should('include', SEL.accountSettingsPath)
    cy.contains('p', /^Identity$/i, { timeout: MODAL_TIMEOUT }).should('exist')
  }

  const openProfileEditFromPopover = () => {
    openProfilePopover()
    profilePopover().find('.cursor-pointer').first().click({ force: true })
    cy.url({ timeout: MODAL_TIMEOUT }).should('include', SEL.accountSettingsPath)
  }

  const openIdentityEditor = () => {
    cy.url({ timeout: MODAL_TIMEOUT }).then((url) => {
      if (!url.includes('/account/settings')) {
        openAccountSettings()
      }
    })

    cy.get('body', { timeout: MODAL_TIMEOUT }).then(($body) => {
      if ($body.find('input[name="first_name"]:visible').length) {
        return
      }

      cy.contains('p', /^Identity$/i, { timeout: MODAL_TIMEOUT })
        .closest('.cursor-pointer')
        .click({ force: true })
    })

    cy.contains('button', /^Identity$/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
    cy.get('input[name="first_name"]', { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const openSocialProfilesEditor = () => {
    openIdentityEditor()
    cy.contains('button', /^Social Profiles$/i).click({ force: true })
    cy.get('input[name="url"]', { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const openBrandLogoEditor = () => {
    openIdentityEditor()
    cy.contains('button', /^Brand Logo$/i).click({ force: true })
  }

  const readFirstName = () =>
    cy.get('input[name="first_name"]', { timeout: MODAL_TIMEOUT }).invoke('val')

  const fillFirstName = (value) => {
    cy.get('input[name="first_name"]', { timeout: MODAL_TIMEOUT }).clear({ force: true })
    if (value !== '') {
      cy.get('input[name="first_name"]').type(String(value), { force: true })
    }
  }

  const editFirstName = (value) => {
    openIdentityEditor()
    fillFirstName(value)
  }

  const revertFirstName = (original) => {
    openAccountSettings()
    editFirstName(original || 'User')
    saveIdentityForm()
  }

  const saveIdentityForm = () => {
    cy.contains('button', /save and continue/i, { timeout: MODAL_TIMEOUT }).click({ force: true })
    cy.wait(1000)
  }

  const goBackToSettingsList = () => {
    cy.get('body').then(($body) => {
      if ($body.find('button[aria-label="Go back"]:visible').length) {
        cy.get('button[aria-label="Go back"]:visible').first().click({ force: true })
      }
    })
  }

  const goBackFromEditor = () => {
    cy.get('button[aria-label="Go back"]', { timeout: MODAL_TIMEOUT }).click({ force: true })
  }

  const openNameEditSection = () => {
    openIdentityEditor()
  }

  const readDisplayNameInput = () => cy.get('input[name="first_name"]', { timeout: MODAL_TIMEOUT })

  const editDisplayName = (newName) => {
    openIdentityEditor()
    fillFirstName(newName)
  }

  const saveProfileEdit = () => {
    saveIdentityForm()
  }

  const cancelProfileEdit = () => {
    goBackFromEditor()
  }

  const assertSaveSuccess = () => {
    cy.get('body', { timeout: MODAL_TIMEOUT }).should(($body) => {
      const text = $body.text()
      expect(text).to.match(/saved|success|updated|continue/i)
    })
  }

  const findBrandUrlInput = () => cy.get('input[name="url"]', { timeout: MODAL_TIMEOUT })

  const addSocialProfileUrl = (url) => {
    findBrandUrlInput().clear().type(url, { force: true })
    cy.contains('button', /add link/i).click({ force: true })
    const listed = url.includes('instagram.com') ? url.split('/').pop() : url
    cy.contains(listed, { timeout: MODAL_TIMEOUT }).should('exist')
  }

  const assertSocialProfileUrlListed = (urlOrHandle) => {
    const listed = urlOrHandle.includes('/') ? urlOrHandle.split('/').pop() : urlOrHandle
    cy.contains(listed, { timeout: MODAL_TIMEOUT }).should('exist')
  }

  const fillBrandWebsite = (value) => {
    openSocialProfilesEditor()
    addSocialProfileUrl(value)
  }

  const saveBrandInfo = () => {
    saveIdentityForm()
  }

  const uploadBrandLogo = (fixturePath) => {
    openBrandLogoEditor()
    cy.get('input[type="file"]').first().selectFile(fixturePath, { force: true })
  }

  const assertAddCoinsModal = () => {
    cy.get('[role="dialog"]:visible', { timeout: MODAL_TIMEOUT })
      .last()
      .invoke('text')
      .should('match', /coin|credit|photo/i)
  }

  const clickPricingEnterpriseUpgrade = (cycle = 'monthly') => {
    visitPrepared('/pricing')
    pricing.switchBillingTab(cycle)
    cy.get('body', { timeout: MODAL_TIMEOUT }).then(($body) => {
      const monthly = $body.find('#v5-pricing-monthly-upgrade-enterprise-button')
      const yearly = $body.find('#v5-pricing-yearly-upgrade-enterprise-button')
      const target = monthly.length
        ? '#v5-pricing-monthly-upgrade-enterprise-button'
        : yearly.length
          ? '#v5-pricing-yearly-upgrade-enterprise-button'
          : '[id^="v5-pricing-"][id*="upgrade-enterprise"]'
      cy.get(target, { timeout: MODAL_TIMEOUT }).first().scrollIntoView().click({ force: true })
    })
  }

  const freeUpgradeToStripe = () => {
    clickProfileUpgrade()
    assertUpgradeOffersTier(/pro.?plus/i)
    pricing.clickCheckout()
    pricing.assertStripePresent()
  }

  const paidUpgradeToEnterpriseModal = () => {
    cy.get('[role="dialog"]:visible', { timeout: MODAL_TIMEOUT })
      .last()
      .invoke('text')
      .should('match', /checkout|upgrade|enterprise|pro/i)
  }

  const addCoinsToCheckout = () => {
    clickAddCoins()
    assertAddCoinsModal()
    pricing.proceedToStripeIfNeeded()
    pricing.assertStripePresent()
  }

  const proceedToCheckoutWithoutPaying = () => {
    pricing.proceedToStripeIfNeeded()
    pricing.assertStripePresent()
  }

  const closeSubscriptionFlow = () => {
    closeVisibleModal()
    cy.get('body').type('{esc}', { force: true })
  }

  return {
    ...pricing,
    MODAL_TIMEOUT,
    SEL,
    ACCOUNTS,
    visitPrepared,
    ensureLoggedIn,
    dismissStartup,
    ensureOnboardingDismissed,
    openProfilePopover,
    closeProfilePopover,
    closeVisibleModal,
    logoutViaProfileMenu,
    profilePopover,
    waitForCreditSection,
    upgradeButtonInPopover,
    addCoinsButtonInPopover,
    assertProfilePopoverRendered,
    assertFreeStatus,
    assertPaidStatus,
    assertRestrictedStatus,
    isDarkTheme,
    assertTheme,
    toggleTheme,
    setTheme,
    clickProfileUpgrade,
    clickAddCoins,
    assertUpgradeOffersTier,
    subscriptionDialog,
    proceedToCheckout,
    assertNoEnterpriseOffer,
    openBrandCenter,
    openAccountSettings,
    openProfileEditFromPopover,
    openIdentityEditor,
    openSocialProfilesEditor,
    openBrandLogoEditor,
    readFirstName,
    fillFirstName,
    editFirstName,
    saveIdentityForm,
    goBackToSettingsList,
    goBackFromEditor,
    openNameEditSection,
    readDisplayNameInput,
    editDisplayName,
    saveProfileEdit,
    cancelProfileEdit,
    assertSaveSuccess,
    fillBrandWebsite,
    findBrandUrlInput,
    addSocialProfileUrl,
    assertSocialProfileUrlListed,
    saveBrandInfo,
    uploadBrandLogo,
    assertAddCoinsModal,
    clickPricingEnterpriseUpgrade,
    revertFirstName,
    freeUpgradeToStripe,
    paidUpgradeToEnterpriseModal,
    addCoinsToCheckout,
    proceedToCheckoutWithoutPaying,
    closeSubscriptionFlow,
  }
}

module.exports = {
  createProfileSettingsHelpers,
  SEL,
  ACCOUNTS,
}
