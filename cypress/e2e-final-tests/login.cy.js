/**
 * Login flow
 * Coverage: email login, Google OAuth smoke tests, invalid credentials, form validation,
 * session persistence, logout, modal navigation, retry after failed login
 *
 * Note: Full Google sign-in cannot be automated in Cypress (Google blocks test browsers).
 */

const SEL = {
  closeOnboarding: 'button[aria-label="Close"]',
  cookieAccept: 'button',
  loginSpan: 'span',
  loginProfileBtn: 'button',
  loginWithEmailBtn: '#login-with-email-button',
  loginWithGoogleBtn: 'Continue with Google',
  usernameInput: '[name="username"]',
  passwordInput: '[name="password"]',
  loginSubmitBtn: '#loginwithemail-login-button',
  profileMenuTrigger: 'nav [aria-haspopup="dialog"].rounded-full',
}

const VALID_EMAIL = 'memoslemi.sdstudio+1011@gmail.com'
const VALID_PASSWORD = '12345678'
const INVALID_CREDENTIALS_MESSAGE = 'email or password is invalid'
const INVALID_EMAIL_MESSAGE = 'Please enter a valid email address!'
const ONBOARDING_MODAL_TITLE = 'Which best describes you?'

const dismissOnboardingModal = () => {
  cy.get('body').then(($body) => {
    if (!$body.text().includes(ONBOARDING_MODAL_TITLE)) {
      return
    }

    if ($body.find(SEL.closeOnboarding).length) {
      cy.get(SEL.closeOnboarding).first().click({ force: true })
    }
  })
}

const dismissBlockingModals = () => {
  dismissOnboardingModal()

  cy.get('body').then(($body) => {
    if ($body.find(SEL.closeOnboarding).length) {
      cy.get(SEL.closeOnboarding).first().click({ force: true })
    }
  })

  cy.get('body').then(($body) => {
    if ($body.text().includes('Accept all')) {
      cy.get(SEL.cookieAccept).contains('Accept all').click({ force: true })
    }
  })
}

const visitApp = () => {
  cy.visit('/', { retryOnStatusCodeFailure: true, timeout: 120000 })
  cy.get('nav', { timeout: 60000 }).should('exist')
}

const dismissPostLoginModals = () => {
  dismissBlockingModals()
}

const openLoginModal = () => {
  visitApp()
  dismissBlockingModals()

  cy.contains(SEL.loginSpan, 'Login', { timeout: 60000 }).click()
  cy.contains(SEL.loginProfileBtn, 'Login').click()

  cy.contains('Welcome Back').should('be.visible')
}

const openLoginEmailForm = () => {
  openLoginModal()
  cy.get(SEL.loginWithEmailBtn).click()
  cy.contains('Welcome Back').should('be.visible')
}

const fillLoginForm = (email, password = VALID_PASSWORD) => {
  cy.get(SEL.usernameInput).clear().type(email)
  cy.get(SEL.passwordInput).clear().type(password)
}

const submitLoginForm = () => {
  cy.get(SEL.loginSubmitBtn).click()
}

const loginWithEmail = (email = VALID_EMAIL, password = VALID_PASSWORD) => {
  openLoginEmailForm()
  fillLoginForm(email, password)
  submitLoginForm()
  expectLoginSuccess()
  dismissPostLoginModals()
}

const expectLoginSuccess = () => {
  cy.contains(SEL.loginSpan, 'Login', { timeout: 30000 }).should('not.exist')
  cy.contains('Welcome Back').should('not.exist')
}

const expectLoggedOut = () => {
  cy.contains(SEL.loginSpan, 'Login', { timeout: 60000 }).should('be.visible')
}

const openProfileMenu = () => {
  cy.get(SEL.profileMenuTrigger).last().click({ force: true })
}

const logoutViaProfileMenu = () => {
  dismissBlockingModals()
  openProfileMenu()
  cy.contains('Logout', { timeout: 10000 }).should('be.visible').click({ force: true })
  dismissBlockingModals()
  expectLoggedOut()
}

const clickContinueWithGoogle = () => {
  cy.contains('button', SEL.loginWithGoogleBtn).should('be.visible').click()
}

const expectGoogleOAuthStarted = () => {
  cy.get('@googleOAuthOpen').should('have.been.called')
  cy.get('@googleOAuthOpen').then((spy) => {
    const urls = spy.getCalls().map((call) => call.args[0])
    expect(urls.some((url) => /accounts\.google\.com/.test(url))).to.eq(true)
  })
}

const ensureLoggedOut = () => {
  cy.clearAllCookies()
  cy.clearAllLocalStorage()
  cy.clearAllSessionStorage()
  visitApp()
  dismissBlockingModals()

  cy.get('body').then(($body) => {
    const hasLogin = [...$body.find(SEL.loginSpan)].some(
      (el) => el.textContent.trim() === 'Login',
    )

    if (hasLogin) {
      return
    }

    dismissBlockingModals()
    openProfileMenu()
    cy.contains('Logout', { timeout: 10000 }).should('be.visible').click({ force: true })
    dismissBlockingModals()
  })

  expectLoggedOut()
}

describe('login test', () => {
  beforeEach(() => {
    ensureLoggedOut()
  })
  describe('email login', () => {
    it('completes login with valid email and password', () => {
      openLoginEmailForm()
      fillLoginForm(VALID_EMAIL, VALID_PASSWORD)
      submitLoginForm()

      expectLoginSuccess()
    })

    it('shows error for invalid password', () => {
      openLoginEmailForm()
      fillLoginForm(VALID_EMAIL, 'wrong-password')
      submitLoginForm()

      cy.contains(INVALID_CREDENTIALS_MESSAGE, { timeout: 15000 }).should('be.visible')
      cy.contains('Welcome Back').should('be.visible')
    })

    it('shows error for unknown email', () => {
      openLoginEmailForm()
      fillLoginForm('unknown.user@example.com', VALID_PASSWORD)
      submitLoginForm()

      cy.contains(INVALID_CREDENTIALS_MESSAGE, { timeout: 15000 }).should('be.visible')
      cy.contains('Welcome Back').should('be.visible')
    })

    it('validates login form fields', () => {
      openLoginEmailForm()

      cy.get(SEL.loginSubmitBtn).should('be.disabled')
      cy.contains('Welcome Back').should('be.visible')

      fillLoginForm('not-an-email')
      submitLoginForm()
      cy.contains(INVALID_EMAIL_MESSAGE).should('be.visible')
      cy.contains(INVALID_CREDENTIALS_MESSAGE).should('not.exist')

      fillLoginForm(VALID_EMAIL)
      cy.get(SEL.passwordInput).clear()
      cy.get(SEL.loginSubmitBtn).should('be.disabled')
      cy.contains(INVALID_CREDENTIALS_MESSAGE).should('not.exist')
    })

    it('persists session after page reload', () => {
      loginWithEmail()

      cy.reload()
      dismissBlockingModals()
      expectLoginSuccess()
    })

    it('succeeds after retrying with correct credentials', () => {
      openLoginEmailForm()
      fillLoginForm(VALID_EMAIL, 'wrong-password')
      submitLoginForm()

      cy.contains(INVALID_CREDENTIALS_MESSAGE, { timeout: 15000 }).should('be.visible')

      fillLoginForm(VALID_EMAIL, VALID_PASSWORD)
      submitLoginForm()
      expectLoginSuccess()
    })
  })

  describe('login modal navigation', () => {
    it('switches between Login and Signup modals', () => {
      visitApp()
      dismissBlockingModals()

      cy.contains(SEL.loginSpan, 'Login', { timeout: 60000 }).click()
      cy.contains('button', 'Signup').click({ force: true })
      cy.contains('Create Account', { timeout: 15000 }).should('be.visible')

      cy.contains('button', 'Login').click({ force: true })
      cy.contains('Welcome Back').should('be.visible')
    })
  })

  describe('logout', () => {
    it('logs out from profile menu', () => {
      loginWithEmail()
      logoutViaProfileMenu()
    })
  })

  describe('google login', () => {
    it('shows Continue with Google on login modal', () => {
      openLoginModal()
      cy.contains('button', SEL.loginWithGoogleBtn).should('be.visible')
      cy.contains('button', 'Continue with Apple').should('be.visible')
      cy.get(SEL.loginWithEmailBtn).should('be.visible')
    })

    it('starts Google OAuth when Continue with Google is clicked', () => {
      openLoginModal()

      cy.window().then((win) => {
        cy.spy(win, 'open').as('googleOAuthOpen')
      })

      clickContinueWithGoogle()
      expectGoogleOAuthStarted()
    })
  })
})
