// Cypress E2E tests for MLS & Real Estate Agencies buttons - aihomedesign.com

const { createMarketingHelpers } = require('../support/marketing-site-shared')

const m = createMarketingHelpers()
const PATH = '/b2b'

describe('MLS & Real Estate Agencies - Button Tests', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
    m.visitLanding(PATH)
  })

  it('vision Brokerages tab is clickable', () => {
    m.clickVisionTab(0)
    cy.get('#tab-ourVision-0').should('be.visible')
  })

  it('vision MLSs tab is clickable', () => {
    m.clickVisionTab(1)
    cy.get('#tab-ourVision-1').should('be.visible')
  })

  it('nav B2B Solution link stays on /b2b', () => {
    m.clickNavLink('B2B Solution')
    m.assertMarketingPath('/b2b')
  })

  it('hero "Book a Demo" navigates to Calendly', () => {
    m.clickById('cta-b2b-hero-book-demo')
    m.assertExternalHost('calendly.com')
  })

  it('vision "Book a Demo" navigates to Calendly', () => {
    m.clickById('cta-vision-brokerages-primary')
    m.assertExternalHost('calendly.com')
  })

  it('bottom "Schedule a call" navigates to Calendly', () => {
    cy.scrollTo('bottom')
    m.clickById('cta-shared-cta-below-primary')
    m.assertExternalHost('calendly.com')
  })

  it('footer Pricing link navigates to app pricing page', () => {
    cy.scrollTo('bottom')
    m.clickById('cta-footer-pricing')
    m.assertAppPath('/pricing')
  })
})
