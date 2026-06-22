/**
 * IR mask flow test
 *
 * Test Suite  : Item Removal mask end-to-end flow
 * Coverage    : Upload → Mask → Login → Generate → Credit (−1) → Assert → Download → Feedback → Bookmark → Regenerate (no credit)
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
  irCard: '#v5-home-tool-item-removal-card',
  fileInput: 'input[type="file"]',
  brushSize: 'div.bg-dark.rounded-full',
  removeBtn: '#v5-service-item-removal-remove-button',
  doneBtn: '#v5-service-item-removal-done-button',
  generateBtn: '#v5-service-item-removal-generate-button',
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: 'ir-mask-flow-user',
})

const TEST_IMAGE = 'cypress/fixtures/images/IR-test.jpg'

const drawMaskOnCanvas = () => {
  cy.contains('Brush').should('be.visible')
  cy.get('canvas:visible').first().should('be.visible').then(($canvas) => {
    const width = $canvas.width()
    const height = $canvas.height()
    const startX = Math.round(width * 0.3)
    const startY = Math.round(height * 0.3)
    const endX = Math.round(width * 0.7)
    const endY = Math.round(height * 0.7)
    const steps = 12

    cy.wrap($canvas).realMouseDown({ x: startX, y: startY })
    for (let i = 1; i <= steps; i += 1) {
      const x = startX + ((endX - startX) * i) / steps
      const y = startY + ((endY - startY) * i) / steps
      cy.wrap($canvas).realMouseMove(x, y)
    }
    cy.wrap($canvas).realMouseUp({ x: endX, y: endY })
  })
}

const captureBeforeImageSrc = () => {
  cy.get('body').then(($body) => {
    if ($body.text().includes('Input Photo')) {
      cy.contains('Input Photo')
        .closest('div')
        .find('img[src]')
        .first()
        .invoke('attr', 'src')
        .as('beforeImageSrc')
      return
    }

    cy.get('img[src*="http"]:visible')
      .first()
      .invoke('attr', 'src')
      .as('beforeImageSrc')
  })
}

const assertRemoveChangedImage = () => {
  cy.get(SEL.downloadBtn, { timeout: 240000 }).should('be.visible')

  cy.get('@beforeImageSrc').then((beforeSrc) => {
    expect(beforeSrc, 'before image src should be captured').to.be.a('string').and.not.be.empty

    cy.get('img[src*="http"]:visible').then(($imgs) => {
      const afterSrcs = [
        ...new Set(
          [...$imgs]
            .map((img) => img.getAttribute('src'))
            .filter((src) => src && src !== beforeSrc),
        ),
      ]

      expect(
        afterSrcs.length,
        'generated image must have a different source than the input (remove applied)',
      ).to.be.greaterThan(0)
    })
  })
}

const enablePointerEvents = () => {
  cy.window().then((win) => {
    win.document.querySelectorAll('.pointer-events-none').forEach((el) => {
      el.style.setProperty('pointer-events', 'auto', 'important')
    })
  })
}

const openMaskToolSidebar = () => {
  cy.get('body').then(($body) => {
    const hasGenerate = [...$body.find('button')].some(
      (btn) => btn.textContent.trim() === 'Generate' && Cypress.dom.isVisible(btn),
    )
    if (hasGenerate) {
      return
    }

    const labels = ['Item Removal Mask', 'AI Item Removal', 'Item Removal']
    const match = [...$body.find('.text-body-md, span.text-body-md')].find((el) =>
      labels.some((label) => el.textContent.includes(label)),
    )

    if (match) {
      cy.wrap(match).closest('div.cursor-pointer').click({ force: true })
      return
    }

    cy.contains(/item removal/i, { timeout: 60000 }).click({ force: true })
  })
}

const submitMaskAfterLogin = () => {
  flow.dismissServerErrorModal()

  cy.get('body', { timeout: 30000 }).then(($body) => {
    if ($body.text().includes('Add to project')) {
      cy.log('Edit ready panel shown — clicking Add to project')
      cy.contains('button', 'Add to project', { timeout: 15000 }).click({ force: true })
    }
  })

  cy.get('body', { timeout: 30000 }).then(($body) => {
    if ($body.find(SEL.doneBtn).filter(':visible').length > 0) {
      cy.get(SEL.doneBtn).scrollIntoView().click({ force: true })
      return
    }

    const hasGenerate = [...$body.find('button')].some(
      (btn) => btn.textContent.trim() === 'Generate' && Cypress.dom.isVisible(btn),
    )
    if (hasGenerate) {
      cy.contains('button', 'Generate').filter(':visible').scrollIntoView().click({ force: true })
      return
    }

    if ($body.find(SEL.removeBtn).filter(':visible').length > 0) {
      cy.log('Re-clicking Remove after login to reveal Done/Generate')
      cy.get(SEL.removeBtn).scrollIntoView().click({ force: true })
    }
  })

  cy.get('body', { timeout: 90000 }).should(($body) => {
    const hasDone = $body.find(SEL.doneBtn).filter(':visible').length > 0
    const hasGenerate = [...$body.find('button')].some(
      (btn) => btn.textContent.trim() === 'Generate' && Cypress.dom.isVisible(btn),
    )
    expect(hasDone || hasGenerate, 'Done or Generate should be visible after mask submit').to.be.true
  })

  cy.get('body').then(($body) => {
    if ($body.find(SEL.doneBtn).filter(':visible').length > 0) {
      cy.get(SEL.doneBtn).scrollIntoView().click({ force: true })
      return
    }

    cy.contains('button', 'Generate').filter(':visible').scrollIntoView().click({ force: true })
  })
}

const regenerateMask = () => {
  flow.dismissBlockingModals()
  cy.get('body').type('{esc}')
  cy.wait(1000)

  flow.readCreditBalance().then((beforeRegenCredits) => {
    cy.log(`Credit before regenerate: ${beforeRegenCredits}`)

    openMaskToolSidebar()

    cy.contains('button', 'Generate', { timeout: 60000 }).should('be.visible').click({ force: true })
    flow.waitForAllResultsReady({ isRegenerate: true })
    flow.assertCreditAfterAction(
      beforeRegenCredits,
      0,
      'regenerate should NOT deduct any credits',
    )
  })
}

describe('IR-mask-flow-test', () => {
  it('completes IR flow', () => {
    cy.clearCookies()
    cy.visit('/')
    flow.dismissBlockingModals()

    flow.watchCreditApi('creditApi')
    cy.get(SEL.irCard).click({ force: true })
    cy.get(SEL.fileInput).selectFile(TEST_IMAGE, { force: true })
    flow.waitForUploadComplete()

    flow.dismissBlockingModals()
    enablePointerEvents()
    cy.contains('Select Area', { timeout: 10000 }).should('be.visible').click({ force: true })
    cy.get(SEL.brushSize).filter('[style*="width: 32px"]').click({ force: true })
    drawMaskOnCanvas()
    cy.get(SEL.removeBtn).click({ force: true })

    flow.loginAfterGenerate({
      reopenLogin: () => cy.get(SEL.removeBtn).click({ force: true }),
    })
    cy.wait('@creditApi', { timeout: 90000 })

    flow.getCreditBalanceFromApi('creditApi').then((creditsAfterLogin) => {
      cy.log(`Credit after login: ${creditsAfterLogin}`)

      cy.url().as('orderUrl')
      captureBeforeImageSrc()
      submitMaskAfterLogin()
      flow.waitForAllResultsReady({
        generateSelector: `${SEL.doneBtn}, ${SEL.generateBtn}`,
        skipGenerateRetry: true,
      })
      assertRemoveChangedImage()

      flow.assertCreditAfterAction(
        creditsAfterLogin,
        -1,
        'first generate should deduct 1 credit',
      ).then(() => {
        cy.get(SEL.downloadBtn).click({ force: true })
        cy.get(SEL.normalDownloadBtn).click({ force: true })
        cy.wait(10000)

        cy.get('body').type('{esc}')
        cy.wait(2000)
        flow.dismissBlockingModals()
        cy.get(SEL.thumbUpBtn).closest('button').click({ force: true })
        cy.get(SEL.moodBtn).closest('button').click({ force: true })
        cy.get(SEL.feedbackDescription).type('The image is clear and the colors are accurate.')
        cy.get(SEL.feedbackSubmitBtn).contains('Submit').click({ force: true })

        regenerateMask()
        cy.get(SEL.bookmarkBtn).click({ force: true })
      })
    })
  })
})
