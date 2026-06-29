/**
 * Signup helpers — shared by signup.cy.js and free-tier credit tests
 *
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env
 */

const SIGNUP_SEL = {
  closeOnboarding: 'button[aria-label="Close"]',
  cookieAccept: 'button',
  loginSpan: 'span',
  signupBtn: 'button',
  signupWithEmailBtn: '#signup-with-email-button',
  usernameInput: '[name="username"]',
  passwordInput: '[name="password"]',
  signupSubmitBtn: '#login-with-email-login-button',
  profileMenuTrigger: 'nav [aria-haspopup="dialog"].rounded-full',
}

const TEST_PASSWORD = '12345678'
const OTP_TASK_TIMEOUT = 120000
const WELCOME_EMAIL_SUBJECT = 'Welcome to AI HomeDesign!'

const uniqueSignupEmail = (label) =>
  `memoslemi.sdstudio+signup-${label}-${Date.now()}@gmail.com`

const dismissBlockingModals = () => {
  cy.get('body').then(($body) => {
    if ($body.find(SIGNUP_SEL.closeOnboarding).length) {
      cy.get(SIGNUP_SEL.closeOnboarding).click()
    }
  })

  cy.get('body').then(($body) => {
    if ($body.text().includes('Accept all')) {
      cy.get(SIGNUP_SEL.cookieAccept).contains('Accept all').click()
    }
  })
}

const openSignupEmailForm = () => {
  cy.visit('/')
  dismissBlockingModals()

  cy.contains(SIGNUP_SEL.loginSpan, 'Login').click()
  cy.get(SIGNUP_SEL.signupBtn).contains('Signup').click()
  cy.get(SIGNUP_SEL.signupWithEmailBtn).click()

  cy.contains('Create Account').should('be.visible')
}

const fillSignupForm = (email, password = TEST_PASSWORD) => {
  cy.get(SIGNUP_SEL.usernameInput).clear().type(email)
  cy.get(SIGNUP_SEL.passwordInput).clear().type(password, { log: false })
}

const submitSignupForm = () => {
  cy.get(SIGNUP_SEL.signupSubmitBtn).click()
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

const fetchOtpFromGmail = (testEmail, afterDate, options = {}) =>
  cy.task(
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

const expectWelcomeEmail = (testEmail, afterDate) =>
  cy.task(
    'waitForEmailWithSubject',
    {
      toEmail: testEmail,
      subject: WELCOME_EMAIL_SUBJECT,
      maxWaitMs: 90000,
      afterDate: afterDate.toISOString(),
    },
    { timeout: OTP_TASK_TIMEOUT },
  )

const expectSignupSuccess = () => {
  cy.contains('Verify Your Email', { timeout: 30000 }).should('not.exist')
  cy.get(SIGNUP_SEL.profileMenuTrigger, { timeout: 90000 }).should('be.visible')
  cy.get('nav').contains(/^Login$/).should('not.exist')
}

const completeSignupWithOtp = (testEmail, { expectWelcome = true } = {}) => {
  const otpRequestedAt = new Date()

  openSignupEmailForm()
  fillSignupForm(testEmail)
  submitSignupForm()
  cy.contains('Verify Your Email', { timeout: 30000 }).should('be.visible')

  return fetchOtpFromGmail(testEmail, otpRequestedAt).then((otp) => {
    const signupCompletedAt = new Date()

    enterOtp(otp)
    expectSignupSuccess()

    if (expectWelcome) {
      expectWelcomeEmail(testEmail, signupCompletedAt).should('eq', true)
    }

    return cy.wrap({ email: testEmail, password: TEST_PASSWORD, completedAt: signupCompletedAt })
  })
}

module.exports = {
  SIGNUP_SEL,
  TEST_PASSWORD,
  uniqueSignupEmail,
  dismissBlockingModals,
  openSignupEmailForm,
  fillSignupForm,
  submitSignupForm,
  enterOtp,
  fetchOtpFromGmail,
  expectWelcomeEmail,
  expectSignupSuccess,
  completeSignupWithOtp,
}
