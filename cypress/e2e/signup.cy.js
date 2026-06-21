/**
 * Signup flow
 * Coverage: valid OTP, invalid OTP, expired OTP, resend OTP, duplicate email, form validation
 *
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env
 */

const SEL = {
  closeOnboarding: 'button[aria-label="Close"]',
  cookieAccept: 'button',
  loginSpan: 'span',
  signupBtn: 'button',
  signupWithEmailBtn: '#signup-with-email-button',
  usernameInput: '[name="username"]',
  passwordInput: '[name="password"]',
  signupSubmitBtn: '#login-with-email-login-button',
}

const TEST_PASSWORD = '12345678'
const EXISTING_ACCOUNT_EMAIL = 'memoslemi.sdstudio+1011@gmail.com'
const OTP_TASK_TIMEOUT = 120000
const RESEND_TIMEOUT = 120000

const WELCOME_EMAIL_SUBJECT = 'Welcome to AI HomeDesign!'
const INVALID_OTP_MESSAGE = 'invalid otp code'
const INVALID_EMAIL_MESSAGE = 'Please enter a valid email address!'
const DUPLICATE_EMAIL_MESSAGE = 'user already exists'

const dismissBlockingModals = () => {
  cy.get('body').then(($body) => {
    if ($body.find(SEL.closeOnboarding).length) {
      cy.get(SEL.closeOnboarding).click()
    }
  })

  cy.get('body').then(($body) => {
    if ($body.text().includes('Accept all')) {
      cy.get(SEL.cookieAccept).contains('Accept all').click()
    }
  })
}

const openSignupEmailForm = () => {
  cy.visit('/')
  dismissBlockingModals()

  cy.contains(SEL.loginSpan, 'Login').click()
  cy.get(SEL.signupBtn).contains('Signup').click()
  cy.get(SEL.signupWithEmailBtn).click()

  cy.contains('Create Account').should('be.visible')
}

const fillSignupForm = (email, password = TEST_PASSWORD) => {
  cy.get(SEL.usernameInput).clear().type(email)
  cy.get(SEL.passwordInput).clear().type(password)
}

const submitSignupForm = () => {
  cy.get(SEL.signupSubmitBtn).click()
}

const enterOtp = (otp) => {
  cy.contains('h2', 'Verify Your Email', { timeout: 30000 }).should('be.visible')

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

const startSignupToOtpScreen = (testEmail) => {
  openSignupEmailForm()
  fillSignupForm(testEmail)
  submitSignupForm()
  cy.contains('Verify Your Email', { timeout: 30000 }).should('be.visible')
}

const fetchOtpFromGmail = (testEmail, afterDate, options = {}) => {
  return cy.task(
    'getOtpFromGmail',
    {
      toEmail: testEmail,
      subjectContains: 'OTP',
      otpRegex: '\\b(\\d{4})\\b',
      maxWaitMs: 90000,
      afterDate: afterDate.toISOString(),
      excludeOtps: options.excludeOtps || [],
    },
    { timeout: OTP_TASK_TIMEOUT },
  )
}

const expectWelcomeEmail = (testEmail, afterDate) => {
  return cy.task(
    'waitForEmailWithSubject',
    {
      toEmail: testEmail,
      subject: WELCOME_EMAIL_SUBJECT,
      maxWaitMs: 90000,
      afterDate: afterDate.toISOString(),
    },
    { timeout: OTP_TASK_TIMEOUT },
  )
}

const expectInvalidOtpError = () => {
  cy.contains(INVALID_OTP_MESSAGE, { matchCase: false, timeout: 15000 }).should('be.visible')
  cy.contains('Verify Your Email').should('be.visible')
}

const expectOtpError = () => {
  cy.contains(INVALID_OTP_MESSAGE, { matchCase: false, timeout: 15000 }).should('be.visible')
  cy.contains('Verify Your Email').should('be.visible')
}

const waitAndClickResend = () => {
  cy.contains(/receive the code/i).should('be.visible')
  cy.contains(/Resend in \d{2}:\d{2}/).should('be.visible')
  cy.contains(/Resend in \d{2}:\d{2}/, { timeout: RESEND_TIMEOUT }).should('not.exist')
  cy.contains(/Resend code/i).click({ force: true })
}

const expectSignupSuccess = () => {
  cy.contains('Verify Your Email', { timeout: 30000 }).should('not.exist')
  cy.contains(SEL.loginSpan, 'Login').should('not.exist')
}

const uniqueSignupEmail = (label) =>
  `memoslemi.sdstudio+signup-${label}-${Date.now()}@gmail.com`

describe('signup test', () => {
  it('completes signup with valid email OTP', () => {
    const testEmail = uniqueSignupEmail('valid')
    const otpRequestedAt = new Date()

    startSignupToOtpScreen(testEmail)

    fetchOtpFromGmail(testEmail, otpRequestedAt).then((otp) => {
      const signupCompletedAt = new Date()

      enterOtp(otp)
      expectSignupSuccess()
      expectWelcomeEmail(testEmail, signupCompletedAt).should('eq', true)
    })
  })

  it('shows error for invalid OTP', () => {
    const testEmail = uniqueSignupEmail('invalid')

    startSignupToOtpScreen(testEmail)
    enterOtp('0000')

    expectInvalidOtpError()
    cy.contains(SEL.loginSpan, 'Login').should('be.visible')
  })

  it('shows error for expired OTP after resend', () => {
    const testEmail = uniqueSignupEmail('expired')
    const otpRequestedAt = new Date()

    startSignupToOtpScreen(testEmail)

    fetchOtpFromGmail(testEmail, otpRequestedAt).then((firstOtp) => {
      waitAndClickResend()
      enterOtp(firstOtp)

      expectOtpError()
      cy.contains(SEL.loginSpan, 'Login').should('be.visible')
    })
  })

  it('completes signup with resent OTP', () => {
    const testEmail = uniqueSignupEmail('resend')
    const otpRequestedAt = new Date()

    startSignupToOtpScreen(testEmail)

    fetchOtpFromGmail(testEmail, otpRequestedAt).then((firstOtp) => {
      waitAndClickResend()

      const resentAt = new Date()

      fetchOtpFromGmail(testEmail, resentAt, { excludeOtps: [firstOtp] }).then((newOtp) => {
        const signupCompletedAt = new Date()

        enterOtp(newOtp)
        expectSignupSuccess()
        expectWelcomeEmail(testEmail, signupCompletedAt).should('eq', true)
      })
    })
  })

  it('shows error for duplicate email', () => {
    openSignupEmailForm()
    fillSignupForm(EXISTING_ACCOUNT_EMAIL)
    submitSignupForm()

    cy.contains(DUPLICATE_EMAIL_MESSAGE, { matchCase: false, timeout: 15000 }).should('be.visible')
    cy.contains('Create Account').should('be.visible')
    cy.contains('Verify Your Email').should('not.exist')
  })

  it('validates signup form fields', () => {
    openSignupEmailForm()

    cy.get(SEL.signupSubmitBtn).should('be.disabled')
    cy.contains('Verify Your Email').should('not.exist')

    fillSignupForm('not-an-email')
    submitSignupForm()
    cy.contains(INVALID_EMAIL_MESSAGE).should('be.visible')
    cy.contains('Verify Your Email').should('not.exist')

    fillSignupForm('new.user@example.com')
    cy.get(SEL.passwordInput).clear()
    cy.get(SEL.signupSubmitBtn).should('be.disabled')
    cy.contains('Verify Your Email').should('not.exist')
  })
})
