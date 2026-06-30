// Cypress E2E tests for AI Renovation buttons - aihomedesign.com

const { createMarketingHelpers } = require('../support/marketing-site-shared')

const m = createMarketingHelpers()
const PATH = '/home-renovation'

describe('AI Renovation - Button Tests', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
    m.visitLanding(PATH)
  })

  it('hero slide "Interior Design" indicator is clickable', () => {
    cy.contains('button.hero-slide-indicator', 'Interior Design').scrollIntoView().click({ force: true })
    cy.wait(500)
    cy.contains('button.hero-slide-indicator', 'Interior Design').should('be.visible')
  })

  it('"Explore our blog" navigates to /blog', () => {
    m.clickBlogExplore()
    m.assertMarketingPath('/blog')
  })

  it('nav Virtual Staging link navigates to /virtual-staging', () => {
    m.clickNavLink('Virtual Staging')
    m.assertMarketingPath('/virtual-staging')
  })

  it('how-it-works step tabs are clickable', () => {
    cy.get('#hiw-tab-0', { timeout: 60000 }).scrollIntoView().click({ force: true })
    cy.wait(500)
    cy.get('#hiw-tab-2').scrollIntoView().click({ force: true })
    cy.get('#hiw-tab-2').should('be.visible')
  })

  it('hero "Start renovating free" navigates to app generate', () => {
    m.clickById('cta-reno-hero-primary')
    m.assertAppPath('/generate')
  })

  it('"Try it" on feature card navigates to interior design tool', () => {
    cy.contains('a', 'Try it', { timeout: 60000 }).first().scrollIntoView().click({ force: true })
    cy.wait(500)
    m.assertAppPath('/generate', { toolSlug: 'tool-interior-design' })
  })

  it('bottom "Start renovating free" navigates to app generate', () => {
    cy.get('#cta-shared-cta-below-primary', { timeout: 60000 }).scrollIntoView().click({ force: true })
    cy.wait(500)
    m.assertAppPath('/generate')
  })
})
