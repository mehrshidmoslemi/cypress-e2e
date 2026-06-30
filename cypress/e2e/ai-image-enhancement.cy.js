// Cypress E2E tests for AI Image Enhancement buttons - aihomedesign.com

const { createMarketingHelpers } = require('../support/marketing-site-shared')

const m = createMarketingHelpers()
const PATH = '/image-enhancement'

describe('AI Image Enhancement - Button Tests', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
    m.visitLanding(PATH)
  })

  it('how-it-works step tabs are clickable', () => {
    m.clickHiwTab(1)
    cy.get('#hiw-tab-1').should('be.visible')
    m.clickHiwTab(3)
    cy.get('#hiw-tab-3').should('be.visible')
  })

  it('vision "Explore Solutions" navigates to /b2b', () => {
    m.clickById('cta-vision-brokerage-secondary')
    m.assertMarketingPath('/b2b')
  })

  it('"Explore our blog" navigates to /blog', () => {
    m.clickBlogExplore()
    m.assertMarketingPath('/blog')
  })

  it('nav Item Removal link navigates to /item-removal', () => {
    m.clickNavLink('Virtual Staging')
    m.assertMarketingPath('/virtual-staging')
  })

  it('vision "Book a Demo" navigates to Calendly', () => {
    m.clickVisionCta('cta-vision-brokerage-primary')
    m.assertExternalHost('calendly.com')
  })

  it('hero "Start enhancing free" navigates to generate with image enhancement tool', () => {
    m.clickLinkByText('Start enhancing free')
    m.assertAppPath('/generate', { toolSlug: 'tool-image-enhancement' })
  })

  it('bottom "Start Your First Listing" navigates to generate with image enhancement tool', () => {
    cy.get('#cta-shared-cta-below-primary', { timeout: 60000 }).scrollIntoView().click({ force: true })
    cy.wait(500)
    m.assertAppPath('/generate', { toolSlug: 'tool-image-enhancement' })
  })
})
