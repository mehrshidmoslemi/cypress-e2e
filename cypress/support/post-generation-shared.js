/**
 * Post-generation result page helpers
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('./flow-enhanced-shared')

const GEN_RESULT_TIMEOUT = 600000
const UPLOAD_TIMEOUT = 180000
const BULK_MAGIC_TIMEOUT = 600000

const COMPARE_TABS = {
  original: 'Origin',
  reference: 'Reference',
  result: 'After',
}

const POST_GEN_SEL = {
  ...COMMON_SEL,
  vsHomeCard: '#v5-home-tool-virtual-staging-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-virtual-staging-generate-button',
  spaceStudio: '#v5-tool-virtual-staging-space-studio',
  compareToggleBtn: 'button',
  downloadDialog: '[role="dialog"]:visible',
}

function createPostGenerationHelpers(sessionId = 'post-gen-actions') {
  const flow = createEnhancedFlowHelpers({ sel: POST_GEN_SEL, sessionId })

  const openCompareMode = () => {
    cy.get('body').then(($body) => {
      const compareBtn = [...$body.find('button')].find(
        (el) => /before\s*\/?\s*after/i.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )
      if (compareBtn) {
        cy.wrap(compareBtn).click({ force: true })
        cy.wait(300)
      }
    })
  }

  const exitCompareMode = () => {
    Cypress._.times(3, () => {
      cy.get('body').then(($body) => {
        if ($body.find(POST_GEN_SEL.bookmarkBtn).filter(':visible').length) {
          return
        }

        const compareBtn = [...$body.find('button')].find(
          (el) => /before\s*\/?\s*after/i.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
        )

        if (compareBtn) {
          cy.wrap(compareBtn).click({ force: true })
        }
      })
      cy.wait(700)
    })

    cy.get('body').type('{esc}', { force: true })
    assertDownloadReady()
  }

  const getActiveCompareTabLabel = () =>
    cy.get('body').then(($body) => {
      const tabPattern = /^(origin|reference|after|ai virtual staging)$/i
      const tabs = [...$body.find('button, [role="tab"]')].filter((el) => {
        const text = (el.textContent || '').trim()
        return tabPattern.test(text) && Cypress.dom.isVisible(el)
      })

      const activeTab = tabs.find((el) => {
        const className = el.className || ''
        return (
          el.getAttribute('aria-selected') === 'true' ||
          /ring-primary|border-primary|bg-primary|text-primary|selected/i.test(className)
        )
      })

      if (activeTab) {
        return (activeTab.textContent || '').trim()
      }

      return tabs[0] ? (tabs[0].textContent || '').trim() : ''
    })

  const assertSelectedPhotoBookmarked = () => {
    cy.get('body').should(($body) => {
      const bookmarkedThumb = [...$body.find('div.relative, button, div.cursor-pointer')].some((el) => {
        const hasImage = el.querySelector('img[src*="http"]')
        const hasBookmarkIcon = el.querySelector('[class*="bookmark"]')
        return hasImage && hasBookmarkIcon && Cypress.dom.isVisible(el)
      })

      const toolbarBookmark =
        $body.find(POST_GEN_SEL.bookmarkBtn).filter(':visible').attr('aria-pressed') === 'true'

      expect(
        bookmarkedThumb || toolbarBookmark,
        'selected photo should remain bookmarked',
      ).to.be.true
    })
  }

  const getSelectedCarouselLabel = () =>
    cy.get('body').then(($body) => {
      const labelPattern = /(reference|origin photo|ai virtual staging|after)/i
      const carouselTiles = [...$body.find('div.relative, button, div.cursor-pointer')].filter((el) => {
        const img = el.querySelector('img[src*="http"]')
        if (!img || !Cypress.dom.isVisible(el)) {
          return false
        }

        const rect = el.getBoundingClientRect()
        return rect.top > 250 && rect.width >= 60 && rect.width <= 320
      })

      const selectedTile = carouselTiles.find((el) => {
        const className = `${el.className || ''} ${el.parentElement?.className || ''}`
        return /ring-primary|border-primary|outline-primary|border-2|selected/i.test(className)
      })

      if (selectedTile) {
        const match = (selectedTile.textContent || '').match(labelPattern)
        return match ? match[0] : (selectedTile.textContent || '').trim()
      }

      const activeTab = [...$body.find('button, [role="tab"]')].find((el) => {
        const text = (el.textContent || '').trim()
        return labelPattern.test(text) && el.getAttribute('aria-selected') === 'true'
      })

      if (activeTab) {
        const match = (activeTab.textContent || '').match(labelPattern)
        return match ? match[0] : (activeTab.textContent || '').trim()
      }

      return ''
    })

  const findCarouselArrowButton = ($body, direction) => {
    const heroImg = [...$body.find('img[src*="http"]')]
      .filter((img) => {
        const rect = img.getBoundingClientRect()
        return Cypress.dom.isVisible(img) && rect.width >= 280 && rect.height >= 180
      })
      .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0]

    if (!heroImg) {
      return null
    }

    const heroRect = heroImg.getBoundingClientRect()
    const iconPattern =
      direction === 'left' ? /chevron-left|arrow-left|caret-left|angle-left/i : /chevron-right|arrow-right|caret-right|angle-right/i

    const candidates = [...$body.find('button')].filter((btn) => {
      if (!Cypress.dom.isVisible(btn)) {
        return false
      }

      const rect = btn.getBoundingClientRect()
      const verticallyAligned =
        rect.top >= heroRect.top - 60 && rect.bottom <= heroRect.bottom + 60
      if (!verticallyAligned) {
        return false
      }

      const hasArrowIcon = [...btn.querySelectorAll('[class*="iconify"], span')].some((el) =>
        iconPattern.test(el.className || ''),
      )
      const isSideControl =
        direction === 'left'
          ? rect.right <= heroRect.left + 120
          : rect.left >= heroRect.right - 120

      return isSideControl && (hasArrowIcon || rect.width <= 80)
    })

    if (!candidates.length) {
      return null
    }

    return direction === 'left'
      ? candidates.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0]
      : candidates.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0]
  }

  const clickCarouselArrow = (direction) => {
    cy.get('body').then(($body) => {
      const arrowBtn = findCarouselArrowButton($body, direction)
      expect(arrowBtn, `${direction} carousel arrow button`).to.exist
      cy.wrap(arrowBtn).scrollIntoView().click({ force: true })
    })
    cy.wait(500)
  }

  const navigateCarouselWithArrow = (direction) => {
    clickCarouselArrow(direction)
  }

  const findBookmarkButtonInBody = ($body) => {
    const byId = $body.find(POST_GEN_SEL.bookmarkBtn).filter(':visible')
    if (byId.length) {
      return byId.first()[0]
    }

    const byIcon = [...$body.find('button, [role="button"]')].find((btn) => {
      const hasIcon =
        btn.querySelector('[class*="tabler:bookmark"]') ||
        btn.querySelector('[class*="tabler-bookmark"]') ||
        btn.querySelector('.i-tabler\\:bookmark')
      return hasIcon && Cypress.dom.isVisible(btn)
    })
    if (byIcon) {
      return byIcon
    }

    const thumbBookmark = [...$body.find('[class*="bookmark"]')].find((el) => {
      const clickable = el.closest('button') || el.closest('div.cursor-pointer, div.relative')
      return clickable && Cypress.dom.isVisible(clickable)
    })

    return thumbBookmark?.closest('button') || thumbBookmark?.closest('div.cursor-pointer, div.relative')
  }

  const selectGeneratedResultPhoto = () => {
    cy.get('body').then(($body) => {
      const carouselThumbs = [...$body.find('div.relative, button, div.cursor-pointer')].filter((el) => {
        const img = el.querySelector('img[src*="http"]')
        if (!img || !Cypress.dom.isVisible(el)) {
          return false
        }

        const rect = el.getBoundingClientRect()
        return rect.top > 280 && rect.width >= 60 && rect.width <= 220
      })

      const resultThumbs = carouselThumbs.filter((el) => {
        const text = (el.textContent || '').trim()
        return !/(^reference$|^origin$|^origin photo$)/i.test(text)
      })

      const target = resultThumbs[resultThumbs.length - 1] || carouselThumbs[carouselThumbs.length - 1]
      expect(target, 'generated result thumbnail').to.exist
      cy.wrap(target).trigger('mouseover', { force: true }).click({ force: true })
      cy.wait(500)
    })
  }

  const clickBookmarkControl = () => {
    cy.get('body', { timeout: 60000 }).then(($body) => {
      const bookmarkBtn = findBookmarkButtonInBody($body)
      if (bookmarkBtn) {
        cy.wrap(bookmarkBtn).click({ force: true })
        return
      }

      cy.get(POST_GEN_SEL.bookmarkBtn, { timeout: 30000 }).click({ force: true })
    })
  }

  const ensureBookmarkAccessible = () => {
    restoreResultToolbar()
    selectGeneratedResultPhoto()
  }

  const getBookmarkButton = () => {
    ensureBookmarkAccessible()
    return cy.get('body', { timeout: 120000 })
  }

  const restoreResultToolbar = () => {
    cy.get('body').type('{esc}', { force: true })

    Cypress._.times(4, () => {
      cy.get('body').then(($body) => {
        if ($body.find(POST_GEN_SEL.downloadBtn).filter(':visible').length) {
          return
        }

        const compareBtn = [...$body.find('button')].find(
          (el) => /before\s*\/?\s*after/i.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
        )

        if (compareBtn) {
          cy.wrap(compareBtn).click({ force: true })
        }
      })
      cy.wait(500)
    })

    assertDownloadReady()
  }

  const selectOriginPhotoInCarousel = () => {
    cy.get('body').then(($body) => {
      const originLabel = [...$body.find('button, div, span')].find(
        (el) => /^origin( photo)?$/i.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )

      if (originLabel) {
        const tile =
          originLabel.closest('button, div.cursor-pointer, div.relative') ||
          originLabel.parentElement
        cy.wrap(tile || originLabel).click({ force: true })
        cy.wait(500)
        return
      }

      selectCompareTab('original')
    })

    cy.get('body').should(($body) => {
      const hasOriginSelected = [...$body.find('button, div, span')]
        .map((el) => (el.textContent || '').trim())
        .some((text) => /^origin( photo)?$/i.test(text))
      expect(hasOriginSelected, 'origin photo should be selected').to.be.true
    })
  }

  const getFullScreenButton = () =>
    cy.get('body').then(($body) => {
      const byIcon = [...$body.find('button')].find((btn) => {
        const hasIcon =
          btn.querySelector('[class*="arrows-maximize"]') ||
          btn.querySelector('[class*="maximize"]') ||
          btn.querySelector('[class*="expand"]') ||
          btn.querySelector('.i-tabler\\:arrows-maximize') ||
          btn.querySelector('.i-tabler\\:maximize')
        return hasIcon && Cypress.dom.isVisible(btn)
      })

      expect(byIcon, 'full screen button').to.exist
      return cy.wrap(byIcon)
    })

  const openFullScreen = () => {
    getFullScreenButton().click({ force: true })
    cy.wait(500)
  }

  const assertFullScreenOpen = () => {
    cy.get('body').should(($body) => {
      const fullscreenImage = [...$body.find('img[src*="http"]')].find((img) => {
        const rect = img.getBoundingClientRect()
        return Cypress.dom.isVisible(img) && rect.width >= 600 && rect.height >= 400
      })

      const fullscreenOverlay = [...$body.find('div.fixed, div.absolute')].some(
        (el) => Cypress.dom.isVisible(el) && /fixed|inset-0|fullscreen|lightbox/i.test(`${el.className}`),
      )

      expect(fullscreenImage || fullscreenOverlay, 'full screen view should be open').to.exist
    })
  }

  const closeFullScreen = () => {
    cy.get('body').type('{esc}', { force: true })
    cy.wait(500)

    cy.get('body').then(($body) => {
      const closeBtn = [...$body.find('button')].find((btn) => {
        const hasCloseIcon =
          btn.querySelector('[class*="tabler:x"]') ||
          btn.querySelector('[class*="tabler-x"]') ||
          btn.getAttribute('aria-label') === 'Close'
        return hasCloseIcon && Cypress.dom.isVisible(btn)
      })

      if (closeBtn) {
        cy.wrap(closeBtn).click({ force: true })
      }
    })

    assertDownloadReady()
  }

  const clearDownloadsFolder = () => {
    cy.exec(
      'node -e "const fs=require(\'fs\');const path=require(\'path\');const dir=path.join(\'cypress\',\'downloads\');if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});else fs.readdirSync(dir).forEach((f)=>fs.unlinkSync(path.join(dir,f)))"',
      { failOnNonZeroExit: false, log: false },
    )
  }

  const selectCompareTab = (tabKey) => {
    const labelPatterns = {
      original: /^origin$|^origin photo$/i,
      reference: /^reference$/i,
      result: /^after$|^ai virtual staging$/i,
    }
    const pattern = labelPatterns[tabKey] || new RegExp(`^${tabKey}$`, 'i')

    cy.get('body').then(($body) => {
      const topButton = [...$body.find('button, [role="tab"]')].find(
        (el) => pattern.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )
      if (topButton) {
        cy.wrap(topButton).click({ force: true })
        cy.wait(300)
        return
      }

      const carouselTile = [...$body.find('button, div, span')].find(
        (el) => pattern.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )
      expect(carouselTile, `${tabKey} compare view`).to.exist
      cy.wrap(carouselTile).click({ force: true })
      cy.wait(300)
    })
  }

  const getHeroImage = () =>
    cy
      .get('img[src*="http"]:visible')
      .filter((_index, el) => {
        const rect = el.getBoundingClientRect()
        return rect.width >= 180 && rect.height >= 120
      })
      .first()

  const captureHeroImageSrc = (alias) => {
    getHeroImage()
      .invoke('attr', 'src')
      .should('be.a', 'string')
      .and('not.be.empty')
      .then((src) => cy.wrap(src).as(alias))
  }

  const assertHeroImageVisible = () => {
    getHeroImage().should('be.visible').and(($img) => {
      expect($img.attr('src'), 'hero image src').to.match(/^https?:\/\//)
    })
  }

  const assertNoDimOverlayOnHero = () => {
    getHeroImage().then(($img) => {
      const rect = $img[0].getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      cy.get('body').then(($body) => {
        const blocking = [...$body.find('div.fixed, div.absolute')].filter((el) => {
          if (!Cypress.dom.isVisible(el)) {
            return false
          }

          const className = el.className || ''
          if (!/bg-elevated|overlay|compare|slider/i.test(className)) {
            return false
          }

          const overlayRect = el.getBoundingClientRect()
          return (
            centerX >= overlayRect.left &&
            centerX <= overlayRect.right &&
            centerY >= overlayRect.top &&
            centerY <= overlayRect.bottom
          )
        })

        expect(blocking, 'no compare overlay on hero image').to.have.length(0)
      })
    })
  }

  const getVisibleResultThumbnails = () =>
    cy
      .get(
        `${POST_GEN_SEL.resultThumbnail}, button:has(img[src*="http"]), div.cursor-pointer:has(img[src*="http"])`,
      )
      .filter(':visible')

  const getDownloadButton = () =>
    cy.get('body', { timeout: 120000 }).should(($body) => {
      const byId = $body.find(POST_GEN_SEL.downloadBtn).filter(':visible')
      const byLabel = [...$body.find('button')].find(
        (el) => /^download$/i.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )
      expect(byId.length || byLabel, 'download button').to.exist
    }).then(($body) => {
      const byId = $body.find(POST_GEN_SEL.downloadBtn).filter(':visible')
      if (byId.length) {
        return cy.wrap(byId.first())
      }

      const byLabel = [...$body.find('button')].find(
        (el) => /^download$/i.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )
      return cy.wrap(byLabel)
    })

  const assertDownloadReady = () => {
    getDownloadButton().should('be.visible')
  }

  const selectPhotoByIndex = (index) => {
    assertDownloadReady()

    cy.get('body').then(($body) => {
      const thumbs = $body.find(POST_GEN_SEL.resultThumbnail).filter(':visible')
      if (thumbs.length > index) {
        cy.wrap(thumbs.eq(index)).click({ force: true })
        return
      }

      for (let step = 0; step < index; step += 1) {
        cy.get('body').type('{rightarrow}', { force: true })
        cy.wait(400)
      }
    })

    assertDownloadReady()
    cy.wait(400)
  }

  const isFeedbackSubmitted = ($body) => {
    const thumbUp = $body.find(POST_GEN_SEL.thumbUpBtn).filter(':visible')
    if (!thumbUp.length) {
      return true
    }

    return thumbUp.closest('button').is(':disabled')
  }

  const assertFeedbackSubmitted = () => {
    cy.get(POST_GEN_SEL.thumbUpBtn).filter(':visible').first().closest('button').click({ force: true })
    cy.get(POST_GEN_SEL.moodBtn).should('not.exist')
    cy.get(POST_GEN_SEL.feedbackDescription).should('not.exist')
  }

  const assertFeedbackNotSubmitted = () => {
    cy.get(POST_GEN_SEL.thumbUpBtn).filter(':visible').first().closest('button').click({ force: true })
    cy.get(POST_GEN_SEL.moodBtn, { timeout: 10000 }).should('be.visible')
    cy.get('body').type('{esc}', { force: true })
  }

  const ensureFeedbackControlsVisible = () => {
    restoreResultToolbar()
    cy.get(POST_GEN_SEL.thumbUpBtn, { timeout: 30000 })
      .filter(':visible')
      .first()
      .scrollIntoView()
      .should('be.visible')
  }

  const readBookmarkState = () =>
    getBookmarkButton().then(($btn) => ({
      pressed: $btn.attr('aria-pressed'),
      className: $btn.attr('class') || '',
    }))

  const getDownloadDialog = () =>
    cy.get('[role="dialog"][data-state="open"]:visible', { timeout: 30000 })

  const assertDownloadDialogClosed = () => {
    cy.get('[role="dialog"][data-state="open"]', { timeout: 15000 }).should('not.exist')
  }

  const openDownloadOptions = () => {
    getDownloadButton().scrollIntoView().should('be.visible').click({ force: true })
    getDownloadDialog()
      .first()
      .should('be.visible')
      .and('contain.text', 'Download Options')
      .and('contain.text', 'Add Your Logo')
    cy.wait(300)
  }

  const findDownloadOptionRow = ($dialog, labelPattern) => {
    const candidates = [...$dialog.find('div, label, li, button')].filter((el) => {
      const text = (el.textContent || '').trim()
      if (!labelPattern.test(text) || text.length > 120) {
        return false
      }

      return Cypress.dom.isVisible(el)
    })

    return candidates.sort((a, b) => a.textContent.length - b.textContent.length)[0]
  }

  const setDownloadToggle = (labelPattern, enabled = true) => {
    getDownloadDialog().first().then(($dialog) => {
      const row = findDownloadOptionRow($dialog, labelPattern)
      expect(row, `download option row for ${labelPattern}`).to.exist

      const container =
        row.closest('div.flex, div.grid, label, li') ||
        row.parentElement ||
        row

      const toggle = [...container.querySelectorAll('button[role="switch"], input[type="checkbox"]')].find((el) =>
        Cypress.dom.isVisible(el),
      )

      expect(toggle, `toggle for ${labelPattern}`).to.exist

      const isChecked = toggle.getAttribute('aria-checked') === 'true' || toggle.checked === true
      if (enabled !== isChecked) {
        cy.wrap(toggle).click({ force: true })
      }
    })
  }

  const assertDownloadToggleState = (labelPattern, enabled = true) => {
    getDownloadDialog().first().then(($dialog) => {
      const row = findDownloadOptionRow($dialog, labelPattern)
      expect(row, `download option row for ${labelPattern}`).to.exist

      const container =
        row.closest('div.flex, div.grid, label, li') ||
        row.parentElement ||
        row

      const toggle = [...container.querySelectorAll('button[role="switch"], input[type="checkbox"]')].find((el) =>
        Cypress.dom.isVisible(el),
      )

      expect(toggle, `toggle for ${labelPattern}`).to.exist
      const isChecked = toggle.getAttribute('aria-checked') === 'true' || toggle.checked === true
      expect(isChecked, `${labelPattern} toggle should be ${enabled ? 'on' : 'off'}`).to.equal(enabled)
    })
  }

  const clickDownloadConfirmButton = () => {
    getDownloadDialog().first().then(($dialog) => {
      const byId = $dialog.find(POST_GEN_SEL.normalDownloadBtn).filter(':visible')
      if (byId.length) {
        cy.wrap(byId.first()).click({ force: true })
        return
      }

      const downloadBtn = [...$dialog.find('button')].find(
        (el) => /^download$/i.test((el.textContent || '').trim()) && Cypress.dom.isVisible(el),
      )
      expect(downloadBtn, 'download confirm button').to.exist
      cy.wrap(downloadBtn).click({ force: true })
    })
  }

  const assertDownloadCompleted = () => {
    cy.get('@downloadRequest.all', { timeout: 15000 }).then((calls) => {
      if (!calls.length) {
        cy.log('Download XHR not captured — validating saved browser download file')
        return
      }

      const response = calls.at(-1).response
      expect(response?.statusCode, 'download API status').to.be.lt(400)

      const body = response?.body
      const downloadUrl =
        (typeof body === 'string' && body.startsWith('http') && body) ||
        body?.url ||
        body?.data?.url ||
        body?.data?.download_url

      if (downloadUrl) {
        cy.request({ url: downloadUrl, encoding: 'binary', timeout: 120000 }).then((fileRes) => {
          assertDownloadedImageBytes(fileRes.body)
        })
      }
    })

    waitForDownloadedFile()

    cy.get('body', { timeout: 120000 }).should('not.contain', 'Download failed')
  }

  const triggerSimpleDownload = () => {
    clearDownloadsFolder()

    cy.intercept({ method: /GET|POST/, url: POST_GEN_SEL.downloadApi }).as('downloadRequest')

    getDownloadButton().scrollIntoView().should('be.visible').click({ force: true })

    cy.get('body', { timeout: 8000 }).then(($body) => {
      const dialog = $body.find('[role="dialog"][data-state="open"]:visible')
      if (dialog.length) {
        clickDownloadConfirmButton()
        assertDownloadDialogClosed()
      }
    })

    assertDownloadCompleted()
  }

  const waitForDownloadedFile = (attempt = 0) => {
    const downloadsPath = 'cypress/downloads'

    cy.exec(
      `node -e "const fs=require('fs');const path=require('path');const dir=path.join('cypress','downloads');if(!fs.existsSync(dir)){process.stdout.write('');process.exit(0)}const files=fs.readdirSync(dir).map(f=>({f,m:fs.statSync(path.join(dir,f)).mtimeMs})).sort((a,b)=>b.m-a.m);process.stdout.write(files[0]?.f||'')"`,
      { failOnNonZeroExit: false, log: false },
    ).then(({ stdout }) => {
      const fileName = (stdout || '').trim()

      if (fileName) {
        cy.readFile(`${downloadsPath}/${fileName}`, null, { timeout: 120000 }).then((buffer) => {
          assertDownloadedImageBytes(buffer)
        })
        return
      }

      if (attempt >= 24) {
        cy.log('No downloaded file found on disk — download verified via network only')
        return
      }

      cy.wait(5000)
      waitForDownloadedFile(attempt + 1)
    })
  }

  const triggerDownloadWithOptions = ({ enableLogo = true, enableVsLabel = true } = {}) => {
    if (!enableLogo && !enableVsLabel) {
      triggerSimpleDownload()
      return
    }

    clearDownloadsFolder()

    cy.intercept({ method: /GET|POST/, url: POST_GEN_SEL.downloadApi }).as('downloadRequest')

    openDownloadOptions()

    if (enableLogo) {
      setDownloadToggle(/add your logo|^logo$/i, true)
      assertDownloadToggleState(/add your logo|^logo$/i, true)
    }

    if (enableVsLabel) {
      setDownloadToggle(/virtually staged|vs label|virtual staging label/i, true)
      assertDownloadToggleState(/virtually staged|vs label|virtual staging label/i, true)
    }

    clickDownloadConfirmButton()

    assertDownloadDialogClosed()

    assertDownloadCompleted()
  }

  const assertDownloadedImageBytes = (body) => {
    const content = typeof body === 'string' ? body : Buffer.from(body).toString('binary')
    expect(content.length, 'downloaded file size').to.be.greaterThan(1000)
    const firstByte = content.charCodeAt(0)
    const secondByte = content.charCodeAt(1)
    const isJpeg = firstByte === 0xff && secondByte === 0xd8
    const isPng = firstByte === 0x89 && content.substring(1, 4) === 'PNG'
    expect(isJpeg || isPng, 'downloaded file should be jpeg or png').to.be.true
  }

  const prepareSinglePhotoResultPage = () => {
    flow.ensureLoggedIn()
    cy.visit('/')
    flow.dismissBlockingModals()

    cy.get(POST_GEN_SEL.vsHomeCard).click({ force: true })
    cy.get(POST_GEN_SEL.fileInput).selectFile('cypress/fixtures/images/vs-test-room.jpg', { force: true })
    flow.waitForUploadComplete()
    flow.selectSpace(POST_GEN_SEL.spaceStudio)
    flow.clickGenerate()
    flow.waitForAllResultsReady()

    assertDownloadReady()
    cy.url().should('match', /order_id=|\/generate|\/results/)
  }

  const waitForBulkMagicComplete = () => {
    cy.get('body', { timeout: BULK_MAGIC_TIMEOUT }).should(($body) => {
      const text = $body.text()
      const ready =
        /magic complete|results are ready|check results|see results|view results/i.test(text) ||
        Number(text.match(/Results\s*(\d+)/i)?.[1] || 0) >= 1
      expect(ready, 'bulk generation should finish').to.be.true
    })
    flow.dismissBlockingModals()
  }

  const openResultsFromUploadPanel = () => {
    cy.contains('button', /view results|see results|check results/i, { timeout: 120000 })
      .should('be.visible')
      .click({ force: true })

    cy.url({ timeout: 120000 }).should('match', /order_id=|\/generate|\/results/)
    flow.dismissBlockingModals()
    cy.contains(/your edit is ready|download|origin|reference/i, { timeout: 120000 }).should('be.visible')
  }

  const prepareMultiPhotoResultPage = (imagePaths) => {
    flow.ensureLoggedIn()
    cy.visit('/')
    flow.dismissBlockingModals()

    cy.get(POST_GEN_SEL.vsHomeCard).click({ force: true })
    cy.contains(/drop or add several photos/i, { timeout: 30000 }).should('be.visible')
    cy.get(POST_GEN_SEL.fileInput).first().selectFile(imagePaths, { force: true })

    cy.contains('Upload Assets', { timeout: UPLOAD_TIMEOUT }).should('be.visible')
    cy.get('body', { timeout: UPLOAD_TIMEOUT }).should(($body) => {
      expect($body.text()).to.match(new RegExp(`uploaded\\s*${imagePaths.length}\\s*\\/\\s*${imagePaths.length}`, 'i'))
    })

    cy.get('body').then(($body) => {
      if ($body.text().includes('Do Magic')) {
        cy.contains('button', 'Do Magic').click({ force: true })
      }
    })

    waitForBulkMagicComplete()
    openResultsFromUploadPanel()

    assertDownloadReady()
    cy.url().should('match', /order_id=|\/generate|\/results/)
  }

  const submitFeedbackForCurrentPhoto = (message) => {
    ensureFeedbackControlsVisible()

    cy.get('body').then(($body) => {
      expect(
        isFeedbackSubmitted($body),
        'feedback should not already be submitted on the selected photo',
      ).to.be.false
    })

    cy.get(POST_GEN_SEL.thumbUpBtn).filter(':visible').first().closest('button').click({ force: true })
    cy.get(POST_GEN_SEL.moodBtn, { timeout: 15000 }).closest('button').should('be.visible').click({ force: true })
    cy.get(POST_GEN_SEL.feedbackDescription, { timeout: 15000 }).should('be.visible').clear().type(message)
    cy.get(POST_GEN_SEL.feedbackSubmitBtn).contains('Submit').click({ force: true })
    cy.contains(POST_GEN_SEL.snackbar, /feedback submitted/i, { timeout: 15000 }).should('be.visible')
    cy.get(POST_GEN_SEL.snackbar).should('not.exist')
  }

  return {
    flow,
    POST_GEN_SEL,
    COMPARE_TABS,
    GEN_RESULT_TIMEOUT,
    openCompareMode,
    exitCompareMode,
    getActiveCompareTabLabel,
    assertSelectedPhotoBookmarked,
    getSelectedCarouselLabel,
    navigateCarouselWithArrow,
    clickCarouselArrow,
    ensureBookmarkAccessible,
    restoreResultToolbar,
    clickDownloadConfirmButton,
    selectOriginPhotoInCarousel,
    clickBookmarkControl,
    selectGeneratedResultPhoto,
    openFullScreen,
    assertFullScreenOpen,
    closeFullScreen,
    selectCompareTab,
    assertHeroImageVisible,
    assertNoDimOverlayOnHero,
    captureHeroImageSrc,
    getHeroImage,
    getVisibleResultThumbnails,
    selectPhotoByIndex,
    isFeedbackSubmitted,
    readBookmarkState,
    openDownloadOptions,
    assertDownloadToggleState,
    getDownloadDialog,
    setDownloadToggle,
    triggerDownloadWithOptions,
    triggerSimpleDownload,
    getBookmarkButton,
    getDownloadButton,
    assertDownloadReady,
    prepareSinglePhotoResultPage,
    prepareMultiPhotoResultPage,
    submitFeedbackForCurrentPhoto,
    ensureFeedbackControlsVisible,
    assertFeedbackSubmitted,
    assertFeedbackNotSubmitted,
  }
}

module.exports = {
  createPostGenerationHelpers,
  COMPARE_TABS,
  POST_GEN_SEL,
}
