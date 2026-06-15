/**
 * IR mask flow test
 *
 * Test Suite  : Item Removal mask end-to-end flow
 * Coverage    : Upload â†’ Mask â†’ Login â†’ Generate â†’ Assert â†’ Download â†’ Feedback â†’ Bookmark â†’ Regenerate
 */

const SEL = {
  irCard: '#v5-home-tool-item-removal-card',
  fileInput: 'input[type="file"]',
  brushSize: 'div.bg-dark.rounded-full',
  removeBtn: '#v5-service-item-removal-remove-button',
  doneBtn: '#v5-service-item-removal-done-button',
  generateBtn: '#v5-service-item-removal-generate-button',
  loginWithEmailBtn: '#login-with-email-button',
  usernameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  loginSubmitBtn: '#loginwithemail-login-button',
  resultThumbnail: 'div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden',
  downloadBtn: '#v5-resultpage-primary-download-button',
  normalDownloadBtn: '#v5-resultpage-downloadmodule-downloadbutton-sec',
  thumbUpBtn: 'span.i-tabler\\:thumb-up',
  moodBtn: 'span.i-tabler\\:mood-empty-filled',
  feedbackDescription: 'textarea[placeholder="Description"]',
  feedbackSubmitBtn: 'button.bg-primary-main',
  bookmarkBtn: '#v5-resultpage-bookmark',
  maskRegenerateBtn: '.gap-2 > .text-body-md',
}

const TEST_IMAGE = 'cypress/fixtures/images/IR-test.jpg'

const isResultReady = ($body, includeGenerating = false) => {
  const ready =
    $body.find(SEL.downloadBtn).length > 0 ||
    $body.text().includes('Generated Images') ||
    $body.find(SEL.resultThumbnail).length > 0

  return includeGenerating ? ready || $body.text().includes('Generating') : ready
}

const drawMaskOnCanvas = () => {
  cy.contains('Brush', { timeout: 15000 }).should('be.visible')
  cy.log('Brush visible - canvas should be ready')
  cy.get('canvas:visible').first().should('be.visible').then(($canvas) => {
    const width = $canvas.width()
    const height = $canvas.height()
    cy.log(`Canvas size: ${width}x${height}`)
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
    cy.log('Mask drawing complete')
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
  // Wait for generated image to fully load (no spinners)
  cy.wait(5000)

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

const clickResultThumbnail = () => {
  cy.get('body').then(($body) => {
    if ($body.find(SEL.downloadBtn).length) {
      return
    }

    if ($body.text().includes('Generated Images')) {
      cy.contains('Generated Images')
        .closest('div')
        .find(SEL.resultThumbnail)
        .first()
        .click({ force: true })
      return
    }

    if ($body.find(SEL.resultThumbnail).length) {
      cy.get(SEL.resultThumbnail).last().click({ force: true })
    }
  })
}

const openResultView = (orderUrl) => {
  cy.get('body', { timeout: 240000 }).should(($body) => {
    expect(isResultReady($body, true), 'generation should start or result should appear').to.be.true
  })

  clickResultThumbnail()

  cy.get('body', { timeout: 120000 }).then(($body) => {
    if ($body.find(SEL.downloadBtn).length) {
      return
    }

    cy.visit(orderUrl)
    cy.get('body', { timeout: 120000 }).should(($body) => {
      expect(isResultReady($body), 'result should be available on order page').to.be.true
    })
    clickResultThumbnail()
  })

  cy.get(SEL.downloadBtn, { timeout: 120000 }).should('be.visible')
}

const loginWithEmail = () => {
  cy.get(SEL.loginWithEmailBtn).click()
  cy.get(SEL.usernameInput).type('memoslemi.sdstudio+1011@gmail.com')
  cy.get(SEL.passwordInput).type('12345678')
  cy.get(SEL.loginSubmitBtn).click()
}

describe('IR-flow-test', () => {
  it('completes IR flow', () => {
    // â”€â”€ 1. Visit & upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cy.visit('https://app.aihomedesign.com/')
    cy.get(SEL.irCard).click()
    cy.get(SEL.fileInput).selectFile(TEST_IMAGE, { force: true })
    cy.wait(2000)

    // ── 2. Mask setup & draw ──────────────────────────────────────────────────
    // Override pointer-events on the tabs container, then click Select Area
    cy.window().then((win) => {
      // Find and override all pointer-events-none containers
      const elements = win.document.querySelectorAll('.pointer-events-none')
      elements.forEach(el => el.style.setProperty('pointer-events', 'auto', 'important'))
      cy.log(`Overrode pointer-events on ${elements.length} elements`)
    })
    cy.contains('Select Area', { timeout: 10000 }).click()
    // Canvas may take a moment to appear
    cy.get('canvas', { timeout: 10000 }).should('exist')
    cy.get(SEL.brushSize).filter('[style*="width: 32px"]').click({ force: true })
    drawMaskOnCanvas()
    cy.get(SEL.removeBtn).click({ force: true })

    // â”€â”€ 3. Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    loginWithEmail()

    // â”€â”€ 4. Submit mask & wait for result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cy.get('canvas:visible', { timeout: 60000 }).first().should('be.visible')
    cy.url().as('orderUrl')
    captureBeforeImageSrc()
    cy.get(SEL.doneBtn).click()
    cy.get('@orderUrl').then((orderUrl) => {
      openResultView(orderUrl)
    })
    assertRemoveChangedImage()

    // â”€â”€ 5. Download â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cy.get(SEL.downloadBtn).click()
    cy.get(SEL.normalDownloadBtn).click()
    cy.wait(10000)

    // â”€â”€ 6. Feedback & bookmark â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cy.get('body').type('{esc}')
    cy.wait(2000)
    cy.get(SEL.thumbUpBtn).closest('button').click({ force: true })
    cy.get(SEL.moodBtn).closest('button').click({ force: true })
    cy.get(SEL.feedbackDescription).type('The image is clear and the colors are accurate.')
    cy.get(SEL.feedbackSubmitBtn).contains('Submit').click({ force: true })
    cy.get(SEL.bookmarkBtn).click({ force: true })

    // ── 7. Regenerate (optional) ──────────────────────────────────────────────
    cy.get('body').then(($body) => {
      const btn = $body.find(SEL.maskRegenerateBtn).filter(':contains("Item Removal Mask")')
      if (btn.length > 0) {
        cy.wrap(btn.first()).click({ force: true })
      }
    })
  })
})


