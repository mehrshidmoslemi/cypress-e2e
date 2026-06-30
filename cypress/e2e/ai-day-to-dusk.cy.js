// Cypress E2E tests for AI Day to Dusk buttons - aihomedesign.com

const { createMarketingHelpers } = require('../support/marketing-site-shared')

const m = createMarketingHelpers()
const PATH = '/day-to-dusk'

describe('AI Day to Dusk - Button Tests', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
    m.visitLanding(PATH)
  })

  it('how-it-works step tabs are clickable', () => {
    m.clickHiwTab(0)
    cy.get('#hiw-tab-0').should('be.visible')
    m.clickHiwTab(2)
    cy.get('#hiw-tab-2').should('be.visible')
  })

  it('vision "Explore Solutions" navigates to /b2b', () => {
    m.clickById('cta-vision-brokerage-secondary')
    m.assertMarketingPath('/b2b')
  })

  it('"Explore our blog" navigates to /blog', () => {
    m.clickBlogExplore()
    m.assertMarketingPath('/blog')
  })

  it('nav Renovation link navigates to /home-renovation', () => {
    m.clickNavLink('Renovation')
    m.assertMarketingPath('/home-renovation')
  })

  it('vision "Book a Demo" navigates to Calendly', () => {
    m.clickVisionCta('cta-vision-brokerage-primary')
    m.assertExternalHost('calendly.com')
  })

  it('hero "Start Day to Dusk Free" navigates to generate with day-to-dusk tool', () => {
    m.clickLinkByText('Start Day to Dusk Free')
    m.assertAppPath('/generate', { toolSlug: 'tool-day-to-dusk' })
  })

  it('bottom "Start Your First Listing" navigates to generate with day-to-dusk tool', () => {
    cy.get('#cta-shared-cta-below-primary', { timeout: 60000 }).scrollIntoView().click({ force: true })
    cy.wait(500)
    m.assertAppPath('/generate', { toolSlug: 'tool-day-to-dusk' })
  })
})
