/**
 * Probe — Studio API section DOM, buttons, and v1 API URLs (discovery)
 */

const { createStudioApiHelpers } = require('../support/studio-api-shared')

const api = createStudioApiHelpers('probe-studio-api')

const collectButtons = ($root) =>
  [...$root.find('button, a')].map((el) => ({
    tag: el.tagName,
    text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100),
    id: el.id || null,
    href: el.getAttribute('href'),
    visible: Cypress.dom.isVisible(el),
    disabled: Boolean(el.disabled),
  }))

const collectCapturedApis = () =>
  cy.get('@v1capture.all', { timeout: 30000 }).then((v1Calls) => {
    return cy.get('@v3capture.all').then((v3Calls) => {
      return [...(v1Calls || []), ...(v3Calls || [])].map((call) => ({
        method: call.request?.method,
        url: call.request?.url,
        status: call.response?.statusCode,
      }))
    })
  })

const probeAccount = (label, accountKey) => {
  cy.intercept('GET', '**/v1/**').as('v1capture')
  cy.intercept('GET', '**/v3/**').as('v3capture')

  api.ensureLoggedIn(accountKey)
  api.openApiSection()

  cy.get('body').then(($body) => {
    const html = $body.html().slice(0, 120000)
    const text = $body.text().replace(/\s+/g, ' ').trim().slice(0, 8000)

    collectCapturedApis().then((capturedApis) => {
      cy.writeFile(`cypress/fixtures/probe-studio-api-${label}.json`, {
        account: label,
        url: window.location.href,
        apiNav: 'nav a[href="/api-access"]',
        apiSectionUrl: '/api-access',
        webhookLogsUrl: '/api-access/logs',
        textSnippet: text,
        buttons: collectButtons($body).filter((b) => b.visible).slice(0, 80),
        inputs: [...$body.find('input, textarea')].map((el) => ({
          tag: el.tagName,
          name: el.name,
          type: el.type,
          id: el.id,
          placeholder: el.placeholder,
          readOnly: el.readOnly,
          valuePreview: (el.value || '').slice(0, 20),
        })),
        hasApiKey: /private api key/i.test(text),
        hasWebhook: /webhook/i.test(text),
        hasUpsell: /purchase our enterprise plan|get monthly|get yearly/i.test(text),
        capturedApis: capturedApis.slice(0, 40),
      })
      cy.writeFile(`cypress/fixtures/probe-studio-api-${label}.txt`, text)
      cy.writeFile(`cypress/fixtures/probe-studio-api-${label}.html`, html)
    })
  })

  if (accountKey === 'enterprise') {
    api.openWebhookLogs()
    cy.wait(3000)
    cy.get('body').then(($body) => {
      collectCapturedApis().then((capturedApis) => {
        cy.writeFile('cypress/fixtures/probe-studio-api-webhook-logs.json', {
          url: window.location.href,
          text: $body.text().replace(/\s+/g, ' ').slice(0, 5000),
          buttons: collectButtons($body).filter((b) => b.visible).slice(0, 50),
          capturedApis: capturedApis.filter((c) => /webhook/i.test(c.url)),
        })
      })
    })
  }
}

describe('Probe Studio API', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  it('enterprise', () => probeAccount('enterprise', 'enterprise'))
  it('proPlusMonthly', () => probeAccount('proPlusMonthly', 'proPlusMonthly'))
  it('proPlusYearly', () => probeAccount('proPlusYearly', 'proPlusYearly'))
})
