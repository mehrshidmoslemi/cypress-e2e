// Cypress E2E tests for Affiliate Program buttons - aihomedesign.com

const { createMarketingHelpers } = require('../support/marketing-site-shared')

const m = createMarketingHelpers()
const PATH = '/affiliate-program'

describe('Affiliate Program - Button Tests', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
    m.visitLanding(PATH)
  })

  it('nav Affiliate Program link navigates to /affiliate-program', () => {
    m.clickFooterLink('Affiliate Program')
    m.assertMarketingPath('/affiliate-program')
  })

  it('hero "Start earning now" navigates to Rewardful signup', () => {
    m.clickLinkByText('Start earning now')
    m.assertExternalHost('getrewardful.com')
  })

  it('"Let\'s talk" navigates to Rewardful signup', () => {
    m.clickById('cta-aff-b2b-get-started')
    m.assertExternalHost('getrewardful.com')
  })

  it('bottom "Start Earning Now" navigates to Rewardful signup', () => {
    cy.get('#cta-shared-cta-below-primary').scrollIntoView().should('be.visible').click({ force: true })
    m.assertExternalHost('getrewardful.com')
  })

})
