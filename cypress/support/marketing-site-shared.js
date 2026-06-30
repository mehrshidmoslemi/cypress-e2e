/**
 * Marketing site (aihomedesign.com) — button navigation helpers
 */

const SITE = 'https://aihomedesign.com'
const APP_HOST = 'app.aihomedesign.com'

function createMarketingHelpers() {
  const visitLanding = (path) => {
    const url = `${SITE}${path}`

    cy.clearAllCookies()
    cy.clearAllLocalStorage()
    cy.visit(url, { timeout: 90000 })
    cy.location('hostname', { timeout: 60000 }).should('eq', 'aihomedesign.com')
    dismissCookieBanner()
    cy.get('footer, #cta-header-primary-desktop', { timeout: 60000 }).should('exist')
    cy.wait(500)
  }

  const dismissCookieBanner = () => {
    cy.get('body').then(($body) => {
      const accept = $body.find('button.cc-btn-primary').filter((_, el) =>
        /accept all/i.test(el.textContent || ''),
      )
      if (accept.length) {
        cy.wrap(accept.first()).click({ force: true })
        cy.wait(300)
      }
    })
  }

  const clickById = (id) => {
    cy.get(`[id="${id}"]`, { timeout: 60000 })
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true })
    cy.wait(500)
  }

  const clickLinkByText = (text, { within } = {}) => {
    const chain = within ? cy.get(within) : cy
    chain.contains('a', text, { matchCase: false, timeout: 20000 })
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true })
    cy.wait(500)
  }

  const clickNavLink = (label) => {
    cy.contains('a.nav-link', label, { matchCase: false, timeout: 60000 })
      .first()
      .scrollIntoView()
      .click({ force: true })
    cy.wait(500)
  }

  const clickFooterLink = (label) => {
    cy.get('footer', { timeout: 20000 }).scrollIntoView()
    cy.get('footer').contains('a', label, { matchCase: false, timeout: 20000 })
      .scrollIntoView()
      .click({ force: true })
    cy.wait(500)
  }

  const normalizePath = (pathname) => pathname.replace(/\/$/, '') || '/'

  const assertMarketingPath = (path) => {
    cy.location('pathname', { timeout: 30000 }).should((pathname) => {
      expect(normalizePath(pathname)).to.eq(normalizePath(path))
    })
    cy.wait(500)
  }

  const assertAppHost = () => {
    cy.location('hostname', { timeout: 30000 }).should('eq', APP_HOST)
    cy.wait(500)
  }

  const assertAppPath = (pathname, { toolSlug } = {}) => {
    assertAppHost()
    cy.location('pathname', { timeout: 30000 }).should('include', pathname)
    if (toolSlug) {
      cy.url().should('include', `tool_slug=${toolSlug}`)
    }
    cy.wait(500)
  }

  const assertExternalHost = (hostnamePart) => {
    cy.location('hostname', { timeout: 30000 }).should('include', hostnamePart)
    cy.wait(500)
  }

  const clickHiwTab = (index) => {
    cy.contains('button.hiw-step', /^\s*0[1-5]/, { timeout: 20000 })
      .first()
      .scrollIntoView()
    cy.get(`#hiw-tab-${index}`, { timeout: 20000 })
      .scrollIntoView()
      .click({ force: true })
    cy.wait(500)
  }

  const clickVisionTab = (index) => {
    cy.get(`#tab-ourVision-${index}`, { timeout: 60000 })
      .scrollIntoView()
      .click({ force: true })
    cy.wait(500)
  }

  const clickVisionCta = (id) => {
    cy.get('#tab-ourVision-0', { timeout: 60000 }).scrollIntoView()
    cy.get(`[id="${id}"]`, { timeout: 60000 }).scrollIntoView().click({ force: true })
    cy.wait(500)
  }

  const clickBlogExplore = () => {
    cy.contains('a', 'Explore our blog', { timeout: 20000 })
      .scrollIntoView()
      .click({ force: true })
    cy.wait(500)
  }

  return {
    SITE,
    APP_HOST,
    visitLanding,
    dismissCookieBanner,
    clickById,
    clickLinkByText,
    clickNavLink,
    clickFooterLink,
    assertMarketingPath,
    assertAppHost,
    assertAppPath,
    assertExternalHost,
    clickHiwTab,
    clickVisionTab,
    clickVisionCta,
    clickBlogExplore,
  }
}

module.exports = { createMarketingHelpers, SITE, APP_HOST }
