// Cypress E2E tests for Homepage Footer buttons - aihomedesign.com

const { createMarketingHelpers } = require('../support/marketing-site-shared')

const m = createMarketingHelpers()

describe('Homepage Footer - Button Tests', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
    m.visitLanding('/')
  })

  it('footer AI Virtual Staging link navigates to /virtual-staging', () => {
    m.clickFooterLink('AI Virtual Staging')
    m.assertMarketingPath('/virtual-staging')
  })

  it('footer AI Photo Editing link navigates to /photo-editing', () => {
    m.clickFooterLink('AI Photo Editing')
    m.assertMarketingPath('/photo-editing')
  })

  it('footer AI Renovation link navigates to /home-renovation', () => {
    m.clickFooterLink('AI Renovation')
    m.assertMarketingPath('/home-renovation')
  })

  it('footer AI Day to Dusk link navigates to /day-to-dusk', () => {
    m.clickFooterLink('AI Day to Dusk')
    m.assertMarketingPath('/day-to-dusk')
  })

  it('footer AI Image Enhancement link navigates to /image-enhancement', () => {
    m.clickFooterLink('AI Image Enhancement')
    m.assertMarketingPath('/image-enhancement')
  })

  it('footer AI Item Removal link navigates to /item-removal', () => {
    m.clickFooterLink('AI Item Removal')
    m.assertMarketingPath('/item-removal')
  })

  it('footer MCP Server link navigates to /mcp', () => {
    m.clickFooterLink('MCP Server')
    m.assertMarketingPath('/mcp')
  })

  it('footer Terms link navigates to /terms-and-conditions', () => {
    m.clickFooterLink('Terms')
    m.assertMarketingPath('/terms-and-conditions')
  })

  it('footer Privacy link navigates to /privacy-policy', () => {
    m.clickFooterLink('Privacy')
    m.assertMarketingPath('/privacy-policy')
  })

  it('footer Refund Policy link navigates to /refund-policy', () => {
    m.clickFooterLink('Refund Policy')
    m.assertMarketingPath('/refund-policy')
  })

  it('footer MLS & Real Estate Agencies link navigates to /b2b', () => {
    cy.get('footer').contains('a', /MLS.*Real Estate Agencies/i).scrollIntoView().click({ force: true })
    cy.wait(500)
    m.assertMarketingPath('/b2b')
  })

  it('footer Affiliate Program link navigates to /affiliate-program', () => {
    m.clickFooterLink('Affiliate Program')
    m.assertMarketingPath('/affiliate-program')
  })

  it('footer API link navigates to /b2b', () => {
    m.clickFooterLink('API')
    m.assertMarketingPath('/b2b')
  })

  it('footer Ideation Center link navigates to /ideas', () => {
    m.clickFooterLink('Ideation Center')
    m.assertMarketingPath('/ideas')
  })

  it('footer What\'s New link navigates to /whats-new', () => {
    m.clickFooterLink("What's New")
    m.assertMarketingPath('/whats-new')
  })

  it('footer Blog link navigates to /blog', () => {
    m.clickFooterLink('Blog')
    m.assertMarketingPath('/blog')
  })

  it('footer support email link has mailto href', () => {
    cy.get('footer').contains('a', 'support@aihomedesign.com')
      .should('have.attr', 'href', 'mailto:support@aihomedesign.com')
  })

  it('footer Pricing link navigates to app pricing page', () => {
    m.clickById('cta-footer-pricing')
    m.assertAppPath('/pricing')
  })
})
