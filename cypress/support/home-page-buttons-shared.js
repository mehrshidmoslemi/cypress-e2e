/**
 * Home page — button navigation helpers
 *
 * Guest home (reference: 2026-06-29_17-24-25.mp4):
 *   Banner Start Now, quick-access tool cards, Services grid cards
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('./flow-enhanced-shared')

const UPLOAD_COPY = /drop or add|browse from device|upload/i

const TOOL_SLUGS = {
  'AI Virtual Staging': 'tool-virtual-staging',
  'AI Day to Dusk': 'tool-day-to-dusk',
  'AI Item Removal': 'tool-item-removal',
  'AI Image Enhancement': 'tool-image-enhancement',
  'AI Interior Designer': 'tool-interior-design',
  'AI Furniture Restyle': 'tool-furniture-restyle',
  'AI Wall Change': 'tool-wall-change',
  'AI Floor Change': 'tool-floor-change',
  'AI Backsplash Change': 'tool-backsplash-change',
  'AI Ceiling Change': 'tool-ceiling-change',
  'AI Under Construction': 'tool-under-construction',
}

const HOME_PAGE_BUTTONS = [
  {
    id: 'start-now',
    section: 'banner',
    label: 'Start Now',
    selector: '#v5-home-login-banner-start-now-button',
    pathname: '/generate',
    toolSlug: null,
  },
  {
    id: 'quick-virtual-staging',
    section: 'quick-access',
    label: 'Use AI Virtual Staging',
    selector: '#v5-home-tool-virtual-staging-card',
    pathname: '/generate',
    toolSlug: 'tool-virtual-staging',
  },
  {
    id: 'quick-day-to-dusk',
    section: 'quick-access',
    label: 'Use AI Day to Dusk',
    selector: '#v5-home-tool-day-to-dusk-card',
    pathname: '/generate',
    toolSlug: 'tool-day-to-dusk',
  },
  {
    id: 'quick-item-removal',
    section: 'quick-access',
    label: 'Use AI Item Removal',
    selector: '#v5-home-tool-item-removal-card',
    pathname: '/generate',
    toolSlug: 'tool-item-removal',
  },
  {
    id: 'quick-image-enhancement',
    section: 'quick-access',
    label: 'Use AI Image Enhancement',
    selector: '#v5-home-tool-image-enhancement-card',
    pathname: '/generate',
    toolSlug: 'tool-image-enhancement',
  },
  ...Object.entries(TOOL_SLUGS).map(([serviceName, toolSlug]) => ({
    id: `services-${toolSlug}`,
    section: 'services',
    label: serviceName,
    serviceName,
    pathname: '/generate',
    toolSlug,
  })),
]

function createHomePageButtonsHelpers(sessionId = 'home-page-buttons') {
  const flow = createEnhancedFlowHelpers({ sel: COMMON_SEL, sessionId })

  const visitHomePrepared = () => {
    cy.clearCookies()
    cy.visit('/')
    flow.prepareSiteForTesting()
    cy.get('nav', { timeout: 60000 }).should('exist')
  }

  const dismissOnboardingIfShown = () => {
    cy.get('body').then(($body) => {
      if ($body.text().includes('Which best describes you?')) {
        cy.get('button[aria-label="Close"]').click({ force: true })
      }
    })
  }

  const clickHomeButton = (button) => {
    if (button.selector) {
      cy.get(button.selector).scrollIntoView().should('be.visible').click({ force: true })
      return
    }

    cy.contains('Services').scrollIntoView().should('be.visible')
    cy.contains('Services').then(($heading) => {
      const section = $heading[0].closest('section') || $heading.parent().parent()[0]
      cy.wrap(section).within(() => {
        cy.contains(button.serviceName).scrollIntoView().click({ force: true })
      })
    })
  }

  const assertGenerateDestination = (button) => {
    cy.location('pathname', { timeout: 30000 }).should('eq', button.pathname)

    if (button.toolSlug) {
      cy.url().should('include', `tool_slug=${button.toolSlug}`)
    } else {
      cy.url().should('not.include', 'tool_slug=')
    }

    dismissOnboardingIfShown()
    cy.get('input[type="file"]', { timeout: 30000 }).should('exist')
    cy.get('body').should(($body) => {
      expect($body.text()).to.match(UPLOAD_COPY)
    })
  }

  const navigateFromHomeButton = (button) => {
    visitHomePrepared()
    clickHomeButton(button)
    assertGenerateDestination(button)
  }

  return {
    flow,
    HOME_PAGE_BUTTONS,
    TOOL_SLUGS,
    visitHomePrepared,
    clickHomeButton,
    assertGenerateDestination,
    navigateFromHomeButton,
    dismissOnboardingIfShown,
  }
}

module.exports = {
  createHomePageButtonsHelpers,
  HOME_PAGE_BUTTONS,
  TOOL_SLUGS,
}
