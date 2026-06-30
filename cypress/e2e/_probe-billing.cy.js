/**
 * Probe billing UI — profile menu, billing paths, renewal controls
 */

const { createPricingPageHelpers } = require('../support/pricing-page-shared')

const pricing = createPricingPageHelpers('probe-billing')

const RENEWAL_PATTERN = /cancel downgrade|cancel auto renewal|resume|renewal/i

const collectButtons = ($root) =>
  [...$root.find('button, a[role="button"], a.base-button, a')].map((el) => ({
    id: el.id || null,
    text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
    disabled: Boolean(el.disabled),
    ariaDisabled: el.getAttribute('aria-disabled'),
    visible: Cypress.dom.isVisible(el),
    href: el.getAttribute('href'),
    tag: el.tagName,
  }))

const collectDialogs = ($root) =>
  [...$root.find('[role="dialog"]')]
    .filter((el) => Cypress.dom.isVisible(el))
    .map((el) => ({
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 1200),
      buttons: collectButtons(Cypress.$(el)),
    }))

describe('probe billing page', () => {
  it('discovers billing path and dumps renewal controls', () => {
    cy.on('uncaught:exception', () => false)

    const capturedApis = []
    const candidatePaths = ['/billing', '/account/billing', '/settings/billing', '/account', '/settings', '/pricing']

    cy.intercept('GET', '**/v1/payment/account/plan**', (req) => {
      req.continue((res) => capturedApis.push({ url: req.url, body: res.body }))
    })
    cy.intercept('GET', '**/v1/payment/account/credit**', (req) => {
      req.continue((res) => capturedApis.push({ url: req.url, body: res.body }))
    })
    cy.intercept('GET', '**/v1/payment/account/subscription**', (req) => {
      req.continue((res) => capturedApis.push({ url: req.url, body: res.body }))
    })

    pricing.ensureLoggedIn('active')

    const pathAttempts = []

    candidatePaths.forEach((path) => {
      cy.visit(path, { failOnStatusCode: false, timeout: 120000 })
      cy.wait(1500)
      cy.url().then((url) => {
        cy.get('body').then(($body) => {
          const renewal = collectButtons($body).filter((b) => b.visible && RENEWAL_PATTERN.test(b.text))
          pathAttempts.push({
            path,
            finalUrl: url,
            renewalButtonCount: renewal.length,
            renewalButtons: renewal,
          })
        })
      })
    })

    cy.visit('/', { timeout: 120000, retryOnStatusCodeFailure: true })
    cy.get('nav [aria-haspopup="dialog"].rounded-full', { timeout: 60000 }).last().click({ force: true })
    cy.wait(1000)

    cy.get('[role="dialog"]:visible, [data-radix-popper-content-wrapper]', { timeout: 30000 }).then(
      ($popover) => {
        const menuLinks = collectButtons($popover).filter((b) => b.visible)
        cy.wrap(menuLinks).as('profileMenuItems')
      },
    )

    cy.get('@profileMenuItems').then((menuLinks) => {
      const billingItem = [...menuLinks].find((item) => /billing/i.test(item.text) || /billing/i.test(item.href || ''))

      if (billingItem?.href) {
        cy.visit(billingItem.href, { timeout: 120000, retryOnStatusCodeFailure: true })
      } else if (billingItem) {
        cy.contains('[role="dialog"]:visible a, [role="dialog"]:visible button', /billing/i).click({
          force: true,
        })
      } else {
        cy.visit('/billing', { failOnStatusCode: false, timeout: 120000 })
      }
    })

    cy.wait(2000)

    cy.url().then((billingUrl) => {
      cy.get('body').then(($body) => {
        const allButtons = collectButtons($body)
        const renewal = allButtons.filter((b) => b.visible && RENEWAL_PATTERN.test(b.text))
        const dialogsBefore = collectDialogs($body)

        const output = {
          billingPath: new URL(billingUrl).pathname,
          profileNavigationUrl: billingUrl,
          pathAttempts,
          capturedApis,
          profileMenuItems: null,
          renewalButtons: renewal,
          allBillingButtons: renewal,
          dialogsBeforeCancelAutoRenewal: dialogsBefore,
          cancelAutoRenewalClicked: false,
          promotionModal: null,
          renewalButtonsAfterCancelAutoRenewal: [],
          dialogsAfterCancelAutoRenewal: [],
        }

        cy.get('@profileMenuItems').then((items) => {
          output.profileMenuItems = items
        })

        const cancelAutoRenewal = allButtons.find(
          (b) => b.visible && /cancel auto renewal/i.test(b.text) && !b.disabled,
        )

        if (!cancelAutoRenewal) {
          cy.writeFile('cypress/fixtures/probe-billing.json', output)
          return
        }

        if (cancelAutoRenewal.id) {
          cy.get(`#${cancelAutoRenewal.id}`).click({ force: true })
        } else {
          cy.contains('button', /cancel auto renewal/i).click({ force: true })
        }

        cy.wait(2000)
        cy.get('body').then(($bodyAfter) => {
          const afterButtons = collectButtons($bodyAfter)
          const afterDialogs = collectDialogs($bodyAfter)
          const promoDialog = afterDialogs.find((d) =>
            /free month|promotion|one month/i.test(d.text),
          )

          output.cancelAutoRenewalClicked = true
          output.renewalButtonsAfterCancelAutoRenewal = afterButtons.filter(
            (b) => b.visible && RENEWAL_PATTERN.test(b.text),
          )
          output.dialogsAfterCancelAutoRenewal = afterDialogs
          output.promotionModal = promoDialog
            ? { text: promoDialog.text, buttons: promoDialog.buttons }
            : null

          cy.writeFile('cypress/fixtures/probe-billing.json', output)
        })
      })
    })
  })
})
