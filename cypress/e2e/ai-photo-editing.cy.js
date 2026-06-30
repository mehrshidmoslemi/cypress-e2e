// Cypress E2E tests for AI Photo Editing buttons - aihomedesign.com

const { createMarketingHelpers } = require('../support/marketing-site-shared')

const m = createMarketingHelpers()
const PATH = '/photo-editing'

describe('AI Photo Editing - Button Tests', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
    m.visitLanding(PATH)
  })

  it('"Explore our blog" navigates to /blog', () => {
    m.clickBlogExplore()
    m.assertMarketingPath('/blog')
  })

  it('nav Virtual Staging link navigates to /virtual-staging', () => {
    m.clickNavLink('Virtual Staging')
    m.assertMarketingPath('/virtual-staging')
  })

  it('"Try Virtual Staging" navigates to generate with virtual staging tool', () => {
    m.clickById('cta-pe-choose-image-enhancement-try')
    m.assertAppPath('/generate', { toolSlug: 'tool-virtual-staging' })
  })

  it('"Learn more" for Virtual Staging navigates to /virtual-staging', () => {
    m.clickById('cta-pe-choose-image-enhancement-learn')
    m.assertMarketingPath('/virtual-staging')
  })

  it('"Try Item Removal" navigates to generate with item removal tool', () => {
    m.clickById('cta-pe-choose-item-removal-try')
    m.assertAppPath('/generate', { toolSlug: 'tool-item-removal' })
  })

  it('"Try Day to Dusk" navigates to generate with day-to-dusk tool', () => {
    m.clickById('cta-pe-choose-object-cleanup-try')
    m.assertAppPath('/generate', { toolSlug: 'tool-day-to-dusk' })
  })

  it('bottom "Start editing free" navigates to app generate', () => {
    cy.get('#cta-shared-cta-below-primary', { timeout: 60000 }).scrollIntoView().click({ force: true })
    cy.wait(500)
    m.assertAppPath('/generate')
  })
})
