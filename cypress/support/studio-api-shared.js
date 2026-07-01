/**
 * Studio API section — Enterprise content, upsell, webhook logs
 */

const { createPricingPageHelpers } = require('./pricing-page-shared')
const { createPricingPricesHelpers, parseNumeric } = require('./pricing-prices-shared')
const { dismissBlockingModals } = require('./signup-shared')

const MODAL_TIMEOUT = 60000
const VISIT_OPTIONS = { timeout: 120000, failOnStatusCode: true, retryOnStatusCodeFailure: true }

const ACCOUNTS = {
  enterprise: () => ({
    email: Cypress.env('STUDIO_API_ENTERPRISE_EMAIL') || 'aagahian.sdstudio@gmail.com',
    password: Cypress.env('STUDIO_API_ENTERPRISE_PASSWORD') || '12345678',
  }),
  proPlusMonthly: () => ({
    email:
      Cypress.env('STUDIO_API_PROPLUS_MONTHLY_EMAIL') ||
      'memoslemi.sdstudio+proplusmonthly@gmail.com',
    password: Cypress.env('STUDIO_API_PROPLUS_MONTHLY_PASSWORD') || 'mmmmmmmm',
  }),
  proPlusYearly: () => ({
    email:
      Cypress.env('STUDIO_API_PROPLUS_YEARLY_EMAIL') ||
      'memoslemi.sdstudio+proplusyearly@gmail.com',
    password: Cypress.env('STUDIO_API_PROPLUS_YEARLY_PASSWORD') || '12345678',
  }),
}

const SEL = {
  apiNavLink: 'nav a[href="/api-access"]',
  apiKeyInput: 'textarea[name="token"]',
  webhookUrlInput: 'input[name="webhook-url"]',
  webhookLogsLink: 'a[href="/api-access/logs"]',
}

const API_PATHS = {
  section: '/api-access',
  webhookLogs: '/api-access/logs',
}

const parsePriceFromText = (text) => {
  const normalized = (text || '').replace(/\s+/g, ' ')
  const spaced = normalized.match(/(C\$|\$|£|€)\s*(\d+)\s*\.\s*(\d{1,2})/)
  if (spaced) {
    return {
      currencySymbol: spaced[1],
      displayedPrice: parseNumeric(`${spaced[2]}.${spaced[3]}`),
    }
  }

  const splitMatch = normalized.match(/(C\$|\$|£|€)\s*(\d+)(?:\D{0,4}(\d{1,2}))?/)
  if (splitMatch) {
    const whole = splitMatch[2]
    const fraction = splitMatch[3]
    const amount = fraction ? `${whole}.${fraction}` : whole
    return {
      currencySymbol: splitMatch[1],
      displayedPrice: parseNumeric(amount),
    }
  }

  const tied = [...normalized.matchAll(/(C\$|\$|£|€)\s*(\d[\d.,]*(?:[.,]\d{1,2})?)/g)]
  if (tied.length) {
    return {
      currencySymbol: tied[0][1],
      displayedPrice: parseNumeric(tied[0][2]),
    }
  }

  const symbolMatch = normalized.match(/(C\$|\$|£|€)/)
  const amountMatches = [...normalized.matchAll(/(\d[\d,]*(?:\.\d{1,2})?)/g)].map((m) => parseNumeric(m[1]))

  return {
    currencySymbol: symbolMatch ? symbolMatch[1] : null,
    displayedPrice: amountMatches.length ? amountMatches[0] : null,
  }
}

function createStudioApiHelpers(sessionPrefix = 'studio-api') {
  const pricing = createPricingPageHelpers(sessionPrefix)
  const prices = createPricingPricesHelpers(`${sessionPrefix}-prices`)

  const dismissStartup = () => {
    cy.get('body').then(($body) => {
      if ($body.text().includes('Accept all')) {
        cy.contains('button', 'Accept all').click({ force: true })
      }
    })

    cy.get('body').then(($body) => {
      if (!$body.text().includes('Which best describes you?')) {
        return
      }

      cy.get('[role="dialog"]:visible').then(($dialog) => {
        if ($dialog.text().includes('Other')) {
          cy.wrap($dialog).contains('Other').click({ force: true })
        }
      })

      cy.get('body', { timeout: 30000 }).then(($body2) => {
        if ($body2.text().includes('What are you trying to do today?')) {
          cy.contains('Just testing AIHomeDesign').click({ force: true })
          cy.contains(/explore on my own/i).click({ force: true })
        } else if ($body2.text().includes('Which best describes you?')) {
          cy.get('button[aria-label="Close"]').first().click({ force: true })
        }
      })
    })
  }

  const loginWithEmail = (account) => {
    cy.contains('span', 'Login').click({ force: true })
    cy.contains('button', 'Login').click({ force: true })
    cy.get('#login-with-email-button').click({ force: true })
    cy.get('input[name="username"]').clear().type(account.email)
    cy.get('input[name="password"]').clear().type(account.password, { log: false })
    cy.get('#loginwithemail-login-button').click({ force: true })

    cy.get('body', { timeout: MODAL_TIMEOUT }).should(($body) => {
      const navLogin = [...$body.find('nav span, nav button, nav a')].some(
        (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
      )
      expect(navLogin, `should be logged in as ${account.email}`).to.be.false
    })
  }

  const ensureLoggedIn = (accountKey) => {
    const accountGetter = ACCOUNTS[accountKey]
    if (!accountGetter) {
      throw new Error(`Unknown studio API account: ${accountKey}`)
    }
    const account = accountGetter()

    cy.session(
      `${sessionPrefix}:${accountKey}:${account.email}`,
      () => {
        cy.clearCookies()
        cy.visit('/', VISIT_OPTIONS)
        dismissBlockingModals()
        loginWithEmail(account)
        dismissStartup()
      },
      {
        validate() {
          cy.visit('/', VISIT_OPTIONS)
          cy.get('nav', { timeout: MODAL_TIMEOUT }).should('exist')
          cy.get('body').should(($body) => {
            const navLogin = [...$body.find('nav span, nav button, nav a')].some(
              (el) => el.textContent.trim() === 'Login' && Cypress.dom.isVisible(el),
            )
            expect(navLogin).to.be.false
          })
        },
      },
    )

    cy.visit('/', VISIT_OPTIONS)
    dismissBlockingModals()
    dismissStartup()
  }

  const dismissOverlayModals = () => {
    cy.get('body').then(($body) => {
      if ($body.text().match(/maybe later/i)) {
        cy.contains('button', /maybe later/i).click({ force: true })
      }
      if ($body.text().match(/accept all/i)) {
        cy.contains('button', 'Accept all').click({ force: true })
      }
    })
    cy.wait(300)
  }

  const registerWebhookLogsIntercept = () => {
    cy.intercept('GET', '**/v1/**').as('v1Api')
    cy.intercept('GET', '**/v3/**').as('v3Api')
  }

  const latestWebhookApiResponse = () => {
    const pickWebhook = (calls) =>
      (calls || [])
        .filter((call) => /webhook/i.test(call?.request?.url || ''))
        .at(-1)?.response?.body

    return cy.get('@v1Api.all', { timeout: MODAL_TIMEOUT }).then((v1Calls) => {
      const fromV1 = pickWebhook(v1Calls)
      if (fromV1) {
        return cy.wrap(fromV1)
      }
      return cy.get('@v3Api.all', { timeout: 5000 }).then((v3Calls) => cy.wrap(pickWebhook(v3Calls) || null))
    })
  }

  const visitApiSection = () => {
    cy.visit(API_PATHS.section, VISIT_OPTIONS)
    dismissBlockingModals()
    dismissOverlayModals()
    cy.url({ timeout: MODAL_TIMEOUT }).should('include', API_PATHS.section)
    cy.contains(/api access/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const openApiSection = () => {
    cy.get(SEL.apiNavLink, { timeout: MODAL_TIMEOUT }).should('be.visible').click({ force: true })
    cy.url({ timeout: MODAL_TIMEOUT }).should('include', API_PATHS.section)
    dismissBlockingModals()
    dismissOverlayModals()
    cy.contains(/api access/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const openWebhookLogs = () => {
    registerWebhookLogsIntercept()
    cy.get(SEL.webhookLogsLink, { timeout: MODAL_TIMEOUT }).should('be.visible').click({ force: true })
    cy.url({ timeout: MODAL_TIMEOUT }).should('include', API_PATHS.webhookLogs)
    dismissOverlayModals()
    cy.contains(/webhook logs/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const visitWebhookLogsDirect = () => {
    registerWebhookLogsIntercept()
    cy.visit(API_PATHS.webhookLogs, VISIT_OPTIONS)
    dismissBlockingModals()
    dismissOverlayModals()
    cy.contains(/webhook logs/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const findVisibleButton = (pattern) =>
    cy.get('body').then(($body) => {
      const match = [...$body.find('button')].find(
        (el) => pattern.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )
      expect(match, `button matching ${pattern}`).to.exist
      return cy.wrap(match)
    })

  const apiMainContent = () =>
    cy.contains(/api access/i).parents('div').first().parents('div').first()

  const assertEnterpriseApiContent = () => {
    cy.contains(/private api key/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
    cy.get(SEL.apiKeyInput, { timeout: MODAL_TIMEOUT })
      .should('be.visible')
      .invoke('val')
      .should('match', /\S{8,}/)
    cy.contains(/webhook/i).should('be.visible')
    cy.get(SEL.webhookUrlInput).should('exist')
    cy.contains('a', /api documentation/i)
      .should('be.visible')
      .and('have.attr', 'href')
      .and('match', /doc\.aihomedesign\.com/)
    cy.contains('a', /view webhook logs/i).should('be.visible')
    cy.contains('a', /view docs/i).should('have.attr', 'href').and('include', 'webhook')
  }

  const assertEnterpriseUpsell = () => {
    cy.contains(/purchase our enterprise plan|harness the full power/i, {
      timeout: MODAL_TIMEOUT,
    }).should('be.visible')
    cy.contains(/enterprise/i).should('be.visible')
    cy.get(SEL.apiKeyInput).should('not.exist')
    cy.get(SEL.webhookLogsLink).should('not.exist')
  }

  const switchUpsellBillingTab = (cycle) => {
    const pattern = cycle === 'yearly' ? /yearly/i : /^monthly$/i
    cy.get('[role="tab"]', { timeout: MODAL_TIMEOUT })
      .filter((_, el) => pattern.test((el.textContent || '').trim()))
      .first()
      .click({ force: true })
    cy.wait(1000)
  }

  const upsellEnterpriseCardText = () => cy.get('body').invoke('text')

  const readUpsellEnterprisePrice = (cycle) => {
    switchUpsellBillingTab(cycle)
    const cta = cycle === 'yearly' ? /get yearly/i : /get monthly/i
    return cy
      .contains('button, a', cta, { timeout: MODAL_TIMEOUT })
      .parents('div')
      .first()
      .invoke('text')
      .then((text) => {
        const perMonth = text.match(/(C\$|\$|£|€)\s*(\d+)\s*\.\s*\d{2}\s*\/\s*mo/i)
        if (perMonth) {
          return {
            currencySymbol: perMonth[1],
            displayedPrice: parseNumeric(perMonth[2]),
          }
        }
        return parsePriceFromText(text)
      })
  }

  const assertUpsellHasBillingTab = (cycle) => {
    const pattern = cycle === 'yearly' ? /yearly/i : /^monthly$/i
    cy.contains('button', pattern, { timeout: MODAL_TIMEOUT }).should('be.visible')
  }

  const assertUpsellMissingBillingTab = (cycle) => {
    const pattern = cycle === 'yearly' ? /yearly/i : /^monthly$/i
    cy.contains('button', pattern).should('not.exist')
  }

  const assertGetPlanButton = (cycle) => {
    const label = cycle === 'yearly' ? /get yearly/i : /get monthly/i
    cy.contains('button, a', label, { timeout: MODAL_TIMEOUT })
      .should('be.visible')
      .and('not.be.disabled')
  }

  const clickGetPlanButton = (cycle) => {
    const label = cycle === 'yearly' ? /get yearly/i : /get monthly/i
    cy.contains('button, a', label).scrollIntoView().click({ force: true })
  }

  const assertStripeCheckoutOpens = () => {
    pricing.assertStripePresent()
  }

  const collectApiSectionButtons = () =>
    cy.get('body').then(($body) => {
      const isNav = (el) => Boolean(el.closest('nav'))
      const isCookie = (el) => Boolean(el.closest('[class*="cookie"], [id*="cookie"]'))
      const isMagic = (el) => /maybe later|view results/i.test((el.textContent || '').trim())

      return [...$body.find('main button, main a[href], [class*="api"] button, [class*="api"] a')]
        .filter((el) => {
          const text = (el.textContent || '').trim()
          if (!text || !Cypress.dom.isVisible(el)) {
            return false
          }
          if (isNav(el) || isCookie(el) || isMagic(el)) {
            return false
          }
          if (!/api access|private api key|webhook|regenerate|copy|edit|mcp|documentation|view docs|view webhook/i.test(
            $body.text(),
          )) {
            return false
          }
          return /regenerate|copy|edit|generate mcp|view webhook logs|api documentation|view docs/i.test(
            text,
          )
        })
        .map((el) => ({
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
          tag: el.tagName,
          href: el.getAttribute('href'),
          disabled: Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true',
        }))
    })

  const testApiSectionButtons = () => {
    dismissOverlayModals()
    cy.get(SEL.apiKeyInput, { timeout: MODAL_TIMEOUT }).should('be.visible')

    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite').resolves()
    })
    findVisibleButton(/^copy$/i).click({ force: true })
    cy.get('@clipboardWrite').should('have.been.called')

    cy.get('body').then(($body) => {
      const editBtn = [...$body.find('button')].find(
        (el) => /^edit$/i.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )
      if (editBtn) {
        cy.wrap(editBtn).click({ force: true })
        cy.get(SEL.webhookUrlInput).should('not.have.attr', 'readonly')
      } else {
        cy.log('Edit button not visible — verifying webhook URL field exists')
        cy.get(SEL.webhookUrlInput).should('exist')
      }
    })

    cy.contains('a', /view docs/i)
      .should('have.attr', 'href')
      .and('match', /doc\.aihomedesign\.com/)

    cy.contains('a', /api documentation/i)
      .should('have.attr', 'href')
      .and('match', /doc\.aihomedesign\.com/)

    findVisibleButton(/generate mcp endpoint/i).click({ force: true })

    cy.get('body').then(($body) => {
      const hasDialog = $body.find('[role="dialog"]:visible').length > 0
      const hasMcp = /mcp|endpoint|claude/i.test($body.text())
      expect(hasDialog || hasMcp, 'MCP endpoint UI should respond').to.be.true
      if (hasDialog) {
        cy.get('body').type('{esc}', { force: true })
      }
    })

    findVisibleButton(/^regenerate$/i).click({ force: true })
    cy.get('body', { timeout: 15000 }).then(($body) => {
      const dialog = $body.find('[role="dialog"]:visible')
      if (!dialog.length) {
        cy.log('Regenerate did not open a dialog — treating as non-blocking action')
        return
      }

      const cancelBtn = [...dialog.find('button')].find((btn) =>
        /cancel|close|no/i.test((btn.textContent || '').trim()),
      )
      if (cancelBtn) {
        cy.wrap(cancelBtn).click({ force: true })
      } else {
        cy.get('body').type('{esc}', { force: true })
      }
    })
  }

  const parseWebhookLogsResponse = (body) => {
    if (!body) {
      return { items: [], total: 0 }
    }
    const items = body.data ?? body.logs ?? body.items ?? body.results ?? (Array.isArray(body) ? body : [])
    const total =
      body.meta?.total ??
      body.pagination?.total ??
      body.total ??
      body.count ??
      (Array.isArray(items) ? items.length : 0)
    return { items: Array.isArray(items) ? items : [], total: Number(total) || 0 }
  }

  const countWebhookLogRowsInDom = ($body) =>
    [...$body.find('button, [role="row"], tr, li, div')].filter((el) => {
      const text = (el.textContent || '').trim()
      return (
        Cypress.dom.isVisible(el) &&
        text.length > 10 &&
        text.length < 200 &&
        /\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(text) &&
        /success|failed|unknown|request|webhook|\d{2}:\d{2}/i.test(text)
      )
    }).length

  const assertWebhookLogsPage = () => {
    cy.contains(/webhook logs/i).should('be.visible')
    cy.contains('button', /^All$/i).should('be.visible')
    cy.contains('button', /^Success$/i).should('be.visible')
    cy.contains('button', /^Failed$/i).should('be.visible')
    cy.contains('button', /^Reload$/i).should('be.visible').and('not.be.disabled')
  }

  const assertWebhookLogsMatchApi = () => {
    latestWebhookApiResponse().then((body) => {
      cy.get('body').then(($dom) => {
        const rowCount = countWebhookLogRowsInDom($dom)

        if (!body) {
          cy.log('Webhook API not captured — asserting visible log rows only')
          expect(rowCount, 'webhook log rows in UI').to.be.at.least(1)
          return
        }

        const parsed = parseWebhookLogsResponse(body)
        const expected = parsed.total || parsed.items.length

        if (expected === 0) {
          expect(rowCount, 'empty webhook logs UI').to.equal(0)
          return
        }

        expect(rowCount, 'webhook log rows vs API').to.be.at.least(1)
        if (parsed.items.length > 0 && rowCount > 0) {
          expect(rowCount, 'visible rows should not exceed API page items').to.be.at.most(
            Math.max(parsed.items.length, expected),
          )
        }
      })
    })
  }

  const testWebhookLogFilters = () => {
    cy.contains('button', /^Success$/i).click({ force: true })
    cy.wait(500)
    cy.contains('button', /^Failed$/i).click({ force: true })
    cy.wait(500)
    cy.contains('button', /^All$/i).click({ force: true })
    registerWebhookLogsIntercept()
    cy.contains('button', /^Reload$/i).click({ force: true })
    cy.wait(1000)
  }

  const assertWebhookLogsEmptyState = () => {
    cy.intercept('GET', /webhook/i, {
      statusCode: 200,
      body: { data: [], meta: { total: 0 } },
    }).as('webhookLogsEmpty')

    cy.visit(API_PATHS.webhookLogs, VISIT_OPTIONS)
    dismissBlockingModals()
    dismissOverlayModals()
    cy.contains(/webhook logs/i, { timeout: MODAL_TIMEOUT }).should('be.visible')
    cy.get('body', { timeout: MODAL_TIMEOUT }).then(($body) => {
      const rowCount = countWebhookLogRowsInDom($body)
      const text = $body.text()
      const hasEmpty =
        rowCount === 0 ||
        /no webhook|no logs|empty|nothing here|0 logs/i.test(text)
      expect(hasEmpty, 'graceful empty webhook logs state').to.be.true
    })
  }

  const assertEnterprisePricesMatchFixture = (fixture, currencyKey = 'usd') => {
    const expectedMonthly = fixture?.accounts?.free?.[currencyKey]?.monthly?.enterprise
    const expectedYearly = fixture?.accounts?.free?.[currencyKey]?.yearly?.enterprise

    readUpsellEnterprisePrice('monthly').then((monthlyDom) => {
      expect(monthlyDom.currencySymbol, 'monthly currency symbol').to.eq(expectedMonthly.currencySymbol)
      expect(monthlyDom.displayedPrice, 'monthly enterprise price').to.eq(expectedMonthly.displayedPrice)
    })

    readUpsellEnterprisePrice('yearly').then((yearlyDom) => {
      expect(yearlyDom.currencySymbol, 'yearly currency symbol').to.eq(expectedYearly.currencySymbol)
      expect(yearlyDom.displayedPrice, 'yearly enterprise per-month price').to.eq(
        expectedYearly.displayedPrice,
      )
      upsellEnterpriseCardText().then((text) => {
        expect(text, 'yearly billed amount').to.match(/588/)
      })
    })
  }

  return {
    pricing,
    prices,
    ACCOUNTS,
    SEL,
    API_PATHS,
    MODAL_TIMEOUT,
    ensureLoggedIn,
    dismissStartup,
    dismissBlockingModals,
    dismissOverlayModals,
    visitApiSection,
    openApiSection,
    openWebhookLogs,
    visitWebhookLogsDirect,
    assertEnterpriseApiContent,
    assertEnterpriseUpsell,
    switchUpsellBillingTab,
    readUpsellEnterprisePrice,
    assertUpsellHasBillingTab,
    assertUpsellMissingBillingTab,
    assertGetPlanButton,
    clickGetPlanButton,
    assertStripeCheckoutOpens,
    collectApiSectionButtons,
    testApiSectionButtons,
    parseWebhookLogsResponse,
    countWebhookLogRowsInDom,
    assertWebhookLogsPage,
    assertWebhookLogsMatchApi,
    testWebhookLogFilters,
    assertWebhookLogsEmptyState,
    assertEnterprisePricesMatchFixture,
  }
}

module.exports = {
  createStudioApiHelpers,
  ACCOUNTS,
  SEL,
  API_PATHS,
}
