/**
 * IR mask flow test
 *
 * Test Suite  : Item Removal mask end-to-end flow
 * Coverage    : Upload → Mask → Generate → Inline Login → Credit (−1) → Assert → Download → Feedback → Bookmark → Regenerate (no credit)
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

const isLoginModalOpen = ($body) =>
  $body.text().includes('Welcome Back') ||
  [...$body.find(SEL.loginWithEmailBtn)].some((el) => Cypress.dom.isVisible(el)) ||
  [...$body.find(SEL.usernameInput)].some((el) => Cypress.dom.isVisible(el))

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

const waitForLoginModal = () => {
  cy.get('body', { timeout: 30000 }).should(($body) => {
    expect(isLoginModalOpen($body), 'login modal should be visible').to.be.true
  })
}

const clickVisibleDoneIfPresent = () => {
  cy.get('body').then(($body) => {
    if ($body.find(SEL.doneBtn).filter(':visible').length > 0) {
      cy.get(SEL.doneBtn).scrollIntoView().click({ force: true })
      return
    }

    const doneBtn = [...$body.find('button')].find(
      (btn) => btn.textContent.trim() === 'Done' && Cypress.dom.isVisible(btn),
    )
    if (doneBtn) {
      cy.wrap(doneBtn).scrollIntoView().click({ force: true })
    }
  })
}

const hasVisibleGenerate = ($body) =>
  $body.find(SEL.generateBtn).filter(':visible').length > 0 ||
  [...$body.find('button')].some(
    (btn) => btn.textContent.trim() === 'Generate' && Cypress.dom.isVisible(btn),
  )

const clickGenerateIfVisible = () => {
  cy.get('body').then(($body) => {
    if (!hasVisibleGenerate($body)) {
      cy.log('Generate button not visible — skipping click')
      return
    }

    if ($body.find(SEL.generateBtn).filter(':visible').length > 0) {
      cy.get(SEL.generateBtn).scrollIntoView().click({ force: true })
      return
    }

    cy.contains('button', 'Generate').filter(':visible').scrollIntoView().click({ force: true })
  })
}

const clickGenerateOrApplyMaskFirst = () => {
  cy.get('body').then(($body) => {
    if (hasVisibleGenerate($body)) {
      cy.log('Clicking Generate to start flow')
      clickGenerateIfVisible()
      return
    }

    cy.log('Generate hidden in mask editor — applying mask with Remove first')
    cy.get(SEL.removeBtn).scrollIntoView().should('be.visible').click({ force: true })
  })

  cy.get('body', { timeout: 30000 }).then(($body) => {
    if (isLoginModalOpen($body)) {
      cy.log('Login modal opened — ready for inline login')
      return
    }

    if (hasVisibleGenerate($body)) {
      cy.log('Generate visible after mask apply — clicking Generate')
      clickGenerateIfVisible()
    }
  })
}

const submitMaskAndClickGenerate = () => {
  drawMaskOnCanvas()
  clickVisibleDoneIfPresent()
  clickGenerateOrApplyMaskFirst()
}

const reopenLoginAfterGenerate = () => {
  cy.get('body').then(($body) => {
    if (isLoginModalOpen($body)) {
      return
    }

    if (hasVisibleGenerate($body)) {
      clickGenerateIfVisible()
      return
    }

    cy.get(SEL.removeBtn).scrollIntoView().click({ force: true })
  })
}

const continueAfterLogin = () => {
  flow.dismissServerErrorModal()

  cy.get('body', { timeout: 90000 }).should(($body) => {
    expect(isLoginModalOpen($body), 'login modal should close after login').to.be.false
  })

  cy.get('body', { timeout: 60000 }).then(($body) => {
    if (/generating/i.test($body.text()) || /your edit is ready/i.test($body.text())) {
      cy.log('Generation already started after login')
      return
    }

    if ($body.find(SEL.downloadBtn).filter(':visible').length > 0) {
      cy.log('Results already ready after login')
      return
    }

    const inMaskEditor =
      $body.find(SEL.removeBtn).filter(':visible').length > 0 ||
      $body.find(SEL.doneBtn).filter(':visible').length > 0

    if (inMaskEditor) {
      cy.log('Resuming generation from mask editor after login')
      clickVisibleDoneIfPresent()
      cy.wait(1000)
      clickGenerateOrApplyMaskFirst()
      return
    }

    if (hasVisibleGenerate($body)) {
      clickGenerateIfVisible()
      return
    }

    cy.log('Waiting for generation to start automatically after login')
  })
}

const regenerateMask = () => {
  cy.get('body').type('{esc}')
  cy.wait(1000)

  flow.readCreditBalance().then((beforeRegenCredits) => {
    cy.log(`Credit before regenerate: ${beforeRegenCredits}`)

    openMaskToolSidebar()

    cy.get('body', { timeout: 30000 }).then(($body) => {
      if (hasVisibleGenerate($body)) {
        clickGenerateIfVisible()
        return
      }

      cy.log('Generate not visible in sidebar — using shared clickGenerate')
      flow.clickGenerate(SEL.generateBtn)
    })

    flow.waitForAllResultsReady({ isRegenerate: true })
    flow.assertCreditAfterAction(
      beforeRegenCredits,
      0,
      'regenerate should NOT deduct any credits',
    )
  })
}

describe('IR-mask-flow-test', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
      if (err.message.includes('rate limit exceeded')) {
        return false
      }
    })
  })

  it('completes IR flow', () => {
    cy.clearCookies()
    cy.visit('/')
    flow.prepareSiteForTesting()

    flow.watchCreditApi('creditApi')
    cy.get(SEL.irCard).click({ force: true })
    cy.get(SEL.fileInput).selectFile(TEST_IMAGE, { force: true })
    flow.waitForUploadComplete()

    enablePointerEvents()
    cy.contains('Select Area', { timeout: 10000 }).should('be.visible').click({ force: true })
    cy.get(SEL.brushSize).filter('[style*="width: 32px"]').click({ force: true })
    submitMaskAndClickGenerate()

    waitForLoginModal()
    flow.loginAfterGenerate({
      reopenLogin: reopenLoginAfterGenerate,
    })
    cy.wait('@creditApi', { timeout: 90000 })

    flow.getCreditBalanceFromApi('creditApi').then((creditsAfterLogin) => {
      cy.log(`Credit after login: ${creditsAfterLogin}`)

      cy.url().as('orderUrl')
      captureBeforeImageSrc()
      continueAfterLogin()
      flow.waitForAllResultsReady({
        generateSelector: `${SEL.generateBtn}, ${SEL.removeBtn}`,
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
