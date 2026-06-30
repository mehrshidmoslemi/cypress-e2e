/**
 * Home page — button navigation
 *
 * Reference recording: 2026-06-29_17-24-25.mp4
 *
 * Verifies each visible home CTA navigates to /generate
 * (with the correct tool_slug when applicable).
 */

const {
  createHomePageButtonsHelpers,
  HOME_PAGE_BUTTONS,
} = require('../support/home-page-buttons-shared')

const home = createHomePageButtonsHelpers('home-page-buttons')

describe('Home page — button navigation', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

  describe('banner', () => {
    HOME_PAGE_BUTTONS.filter((button) => button.section === 'banner').forEach((button) => {
      it(`"${button.label}" navigates to ${button.pathname}`, () => {
        home.navigateFromHomeButton(button)
      })
    })
  })

  describe('quick-access tool cards', () => {
    HOME_PAGE_BUTTONS.filter((button) => button.section === 'quick-access').forEach((button) => {
      it(`"${button.label}" navigates to ${button.pathname}?tool_slug=${button.toolSlug}`, () => {
        home.navigateFromHomeButton(button)
      })
    })
  })

  describe('Services grid', () => {
    HOME_PAGE_BUTTONS.filter((button) => button.section === 'services').forEach((button) => {
      it(`Services "${button.label}" navigates to ${button.pathname}?tool_slug=${button.toolSlug}`, () => {
        home.navigateFromHomeButton(button)
      })
    })
  })
})
