/**
 * Forgot password flow
 * Coverage: reset request, OTP verification, new password, validation, navigation,
 * post-reset login verification (new password works, old password rejected)
 *
 * Test account: memoslemi.sdstudio+1012@gmail.com
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env
 */

const SEL = {
  closeOnboarding: 'button[aria-label="Close"]',
  cookieAccept: 'button',
  loginSpan: 'span',
  loginProfileBtn: 'button',
  loginWithEmailBtn: '#login-with-email-button',
  usernameInput: '[name="username"]',
  passwordInput: '[name="password"]',
  resetEmailInput: '[name="email"]',
  newPasswordInput: '[name="newPassword"]',
  resetRequestBtn: '#Reset-Pass-Request',
  forgetPasswordLink: /forget password/i,
  loginSubmitBtn: '#loginwithemail-login-button',
  profileMenuTrigger: 'nav [aria-haspopup="dialog"].rounded-full',
}

const RESET_TEST_EMAIL = 'memoslemi.sdstudio+1012@gmail.com'
const OLD_PASSWORD = '12345678'
const NEW_PASSWORD = '87654321'
const OTP_TASK_TIMEOUT = 180000
const OTP_MAX_WAIT_MS = 120000

const INVALID_OTP_MESSAGE = 'invalid otp code'
const INVALID_CREDENTIALS_MESSAGE = 'email or password is invalid'
const FORGOT_PASSWORD_TITLE = 'Forgot Password'
const VERIFY_EMAIL_TITLE = 'Verify Your Email'
const NEW_PASSWORD_TITLE = 'Create a New Password'

let usedResetOtps = []

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

const openLoginEmailForm = () => {
  visitApp()
  dismissBlockingModals()
  cy.contains(SEL.loginSpan, 'Login', { timeout: 60000 }).click()
  cy.contains(SEL.loginProfileBtn, 'Login').click()
  cy.get(SEL.loginWithEmailBtn).click()
  cy.get(SEL.usernameInput, { timeout: 15000 }).should('be.visible')
}

const expectLoggedOut = () => {
  cy.contains(SEL.loginSpan, 'Login', { timeout: 60000 }).should('be.visible')
}

const openProfileMenu = () => {
  cy.get(SEL.profileMenuTrigger).last().click({ force: true })
}

const openForgotPasswordForm = () => {
  openLoginEmailForm()
  cy.contains(SEL.forgetPasswordLink).click({ force: true })
  cy.contains(FORGOT_PASSWORD_TITLE, { timeout: 15000 }).should('be.visible')
  cy.get(SEL.resetEmailInput).should('be.visible')
}

const submitResetEmail = (email) => {
  cy.get(SEL.resetEmailInput).clear().type(email)
  cy.get(SEL.resetRequestBtn).click()
}

const enterOtp = (otp) => {
  cy.contains('Please enter the code below', { timeout: 30000 }).should('be.visible')

  cy.contains('Please enter the code below')
    .next()
    .find('input')
    .should('have.length.at.least', otp.length)
    .then(($inputs) => {
      const otpInputs = $inputs.slice(0, otp.length)

      otp.split('').forEach((digit, index) => {
        cy.wrap(otpInputs.eq(index)).click({ force: true }).type(digit, { force: true })
      })
    })
}

const fetchOtpFromGmail = (email, afterDate, options = {}) => {
  return cy
    .task(
      'getOtpFromGmail',
      {
        toEmail: email,
        subjectContains: 'OTP',
        otpRegex: '\\b(\\d{4})\\b',
        maxWaitMs: options.maxWaitMs || OTP_MAX_WAIT_MS,
        afterDate: afterDate.toISOString(),
        excludeOtps: [...usedResetOtps, ...(options.excludeOtps || [])],
      },
      { timeout: OTP_TASK_TIMEOUT },
    )
    .then((otp) => {
      usedResetOtps.push(String(otp))
      return otp
    })
}

const requestResetOtp = (email = RESET_TEST_EMAIL) => {
  openForgotPasswordForm()
  return cy.wrap(new Date()).then((otpRequestedAt) => {
    submitResetEmail(email)
    expectOtpScreen(email)
    return cy.wrap(otpRequestedAt)
  })
}

const expectOtpScreen = (email = RESET_TEST_EMAIL) => {
  cy.contains(VERIFY_EMAIL_TITLE, { timeout: 30000 }).should('be.visible')
  cy.contains(email).should('be.visible')
}

const expectInvalidOtpError = () => {
  cy.contains(INVALID_OTP_MESSAGE, { matchCase: false, timeout: 15000 }).should('be.visible')
  cy.contains(VERIFY_EMAIL_TITLE).should('be.visible')
}

const expectNewPasswordScreen = () => {
  cy.contains(NEW_PASSWORD_TITLE, { timeout: 30000 }).should('be.visible')
  cy.get(SEL.newPasswordInput).should('be.visible')
}

const expectPasswordResetSuccess = () => {
  cy.contains(NEW_PASSWORD_TITLE, { timeout: 30000 }).should('not.exist')
  cy.contains(VERIFY_EMAIL_TITLE).should('not.exist')
  cy.contains(FORGOT_PASSWORD_TITLE).should('not.exist')
}

const setNewPassword = (password = NEW_PASSWORD) => {
  expectNewPasswordScreen()
  cy.get(SEL.newPasswordInput).clear().type(password, { log: false })
  cy.contains('button', 'Set New Password').click({ force: true })
}

const fillLoginForm = (email, password) => {
  cy.get(SEL.usernameInput).clear().type(email)
  cy.get(SEL.passwordInput).clear().type(password, { log: false })
}

const submitLoginForm = () => {
  cy.get(SEL.loginSubmitBtn).click()
}

const attemptLogin = (email, password) => {
  openLoginEmailForm()
  fillLoginForm(email, password)
  submitLoginForm()
}

const expectLoginSuccess = () => {
  cy.contains(SEL.loginSpan, 'Login', { timeout: 30000 }).should('not.exist')
  cy.contains('Welcome Back').should('not.exist')
}

const expectLoginFailure = () => {
  cy.contains(INVALID_CREDENTIALS_MESSAGE, { timeout: 15000 }).should('be.visible')
  cy.contains(SEL.loginSpan, 'Login').should('be.visible')
}

const dismissPostLoginModals = () => {
  dismissBlockingModals()
}

const credentialsAccepted = (email, password) => {
  openLoginEmailForm()
  fillLoginForm(email, password)
  submitLoginForm()

  return cy
    .get('body', { timeout: 20000 })
    .should(($body) => {
      const hasProfile = $body.find(SEL.profileMenuTrigger).length > 0
      const hasLoginLink = [...$body.find(SEL.loginSpan)].some(
        (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
      )
      const hasError = $body.text().toLowerCase().includes(INVALID_CREDENTIALS_MESSAGE)

      expect((hasProfile && !hasLoginLink) || hasError).to.eq(true)
    })
    .then(($body) => {
      const hasProfile = $body.find(SEL.profileMenuTrigger).length > 0
      const hasLoginLink = [...$body.find(SEL.loginSpan)].some(
        (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
      )

      return hasProfile && !hasLoginLink
    })
}

const verifyAlreadyResetState = () => {
  ensureLoggedOut()
  attemptLogin(RESET_TEST_EMAIL, OLD_PASSWORD)
  expectLoginFailure()

  attemptLogin(RESET_TEST_EMAIL, NEW_PASSWORD)
  expectLoginSuccess()
  dismissPostLoginModals()
}

const runFullResetAndVerifyLogin = () => {
  ensureLoggedOut()

  return requestResetOtp().then((otpRequestedAt) => {
    return completeResetWithOtp(otpRequestedAt, NEW_PASSWORD).then(() => {
      attemptLogin(RESET_TEST_EMAIL, OLD_PASSWORD)
      expectLoginFailure()

      attemptLogin(RESET_TEST_EMAIL, NEW_PASSWORD)
      expectLoginSuccess()
      dismissPostLoginModals()
    })
  })
}

const verifyPostResetLoginBehavior = () => {
  credentialsAccepted(RESET_TEST_EMAIL, OLD_PASSWORD).then((oldAccepted) => {
    if (oldAccepted) {
      runFullResetAndVerifyLogin()
      return
    }

    credentialsAccepted(RESET_TEST_EMAIL, NEW_PASSWORD).then((newAccepted) => {
      if (newAccepted) {
        verifyAlreadyResetState()
        return
      }

      runFullResetAndVerifyLogin()
    })
  })
}

const completeResetWithOtp = (otpRequestedAt, password = NEW_PASSWORD) => {
  return fetchOtpFromGmail(RESET_TEST_EMAIL, otpRequestedAt).then((otp) => {
    enterOtp(otp)
    expectNewPasswordScreen()
    setNewPassword(password)
    expectPasswordResetSuccess()
  })
}

describe('forgot password test', () => {
  beforeEach(() => {
    ensureLoggedOut()
  })

  describe('new password', () => {
    beforeEach(() => {
      usedResetOtps = []
    })

    it('allows login with new password and rejects old password after reset', { retries: 1 }, () => {
      verifyPostResetLoginBehavior()
    })
  })

  describe('navigation', () => {
    it('opens forgot password form from login email screen', () => {
      openForgotPasswordForm()

      cy.contains(FORGOT_PASSWORD_TITLE).should('be.visible')
      cy.get(SEL.resetEmailInput).should('be.visible')
      cy.get(SEL.resetRequestBtn).should('be.visible')
      cy.contains('button', 'Back').should('be.visible')
    })

    it('returns to login form via Back button', () => {
      openForgotPasswordForm()

      cy.contains('button', 'Back').click({ force: true })

      cy.get(SEL.usernameInput).should('be.visible')
      cy.get(SEL.passwordInput).should('be.visible')
      cy.contains(FORGOT_PASSWORD_TITLE).should('not.exist')
    })
  })

  describe('reset request', () => {
    it('submits valid email and shows OTP verification screen', () => {
      requestResetOtp()
    })

    it('validates email format on reset request', () => {
      openForgotPasswordForm()
      submitResetEmail('not-an-email')

      cy.get(SEL.resetEmailInput).should('have.attr', 'aria-invalid', 'true')
      cy.contains(FORGOT_PASSWORD_TITLE).should('be.visible')
      cy.contains(VERIFY_EMAIL_TITLE).should('not.exist')
    })

    it('does not proceed to OTP for unknown email', () => {
      openForgotPasswordForm()
      submitResetEmail('unknown.user@example.com')

      cy.contains(FORGOT_PASSWORD_TITLE, { timeout: 15000 }).should('be.visible')
      cy.contains(VERIFY_EMAIL_TITLE).should('not.exist')
    })
  })

  describe('otp verification', () => {
    it('shows error for invalid OTP', () => {
      requestResetOtp()
      enterOtp('0000')
      expectInvalidOtpError()
    })

    it('returns to email entry via Change Email Address', () => {
      requestResetOtp()

      cy.contains('button', 'Change Email Address').click({ force: true })

      cy.contains(FORGOT_PASSWORD_TITLE).should('be.visible')
      cy.get(SEL.resetEmailInput).should('be.visible')
      cy.contains(VERIFY_EMAIL_TITLE).should('not.exist')
    })
  })
})
