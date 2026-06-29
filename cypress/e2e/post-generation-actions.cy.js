/**
 * Post-Generation Actions E2E
 *
 * Account: memoslemi.sdstudio+10000@gmail.com
 * Flow: Login → VS upload → generate → result page → Compare / Feedback / Bookmark / Download
 *
 * Compare tabs in UI: Origin (Original), Reference, After (Result)
 */

const { createPostGenerationHelpers } = require('../support/post-generation-shared')

const postGen = createPostGenerationHelpers('post-gen-actions-10000')

let resultPageUrl = ''

const ensureResultPageReady = () => {
  postGen.flow.dismissBlockingModals()
  postGen.assertDownloadReady()
}

const revisitResultPage = () => {
  expect(resultPageUrl, 'result page url').to.match(/order_id=|\/generate|\/results/)
  cy.visit(resultPageUrl)
  postGen.flow.dismissBlockingModals()
  cy.contains(/your edit is ready|download|origin|reference/i, { timeout: 120000 }).should('be.visible')
  postGen.restoreResultToolbar()
}

describe('Post-Generation Actions', { testIsolation: false }, () => {
  it('logs in and opens a result page with generated images', () => {
    postGen.prepareSinglePhotoResultPage()
    postGen.assertDownloadReady()
    cy.url().then((url) => {
      resultPageUrl = url
    })
  })

  describe('Bookmark', () => {
    it('bookmarks one photo and keeps state consistent across compare tabs', () => {
      ensureResultPageReady()
      postGen.selectGeneratedResultPhoto()
      postGen.clickBookmarkControl()

      cy.contains(postGen.POST_GEN_SEL.snackbar, /bookmark/i, { timeout: 15000 }).should('be.visible')
      cy.get(postGen.POST_GEN_SEL.snackbar).should('not.exist')

      postGen.assertSelectedPhotoBookmarked()
      postGen.openCompareMode()

      postGen.selectCompareTab('reference')
      postGen.assertSelectedPhotoBookmarked()

      postGen.selectCompareTab('original')
      postGen.assertSelectedPhotoBookmarked()

      postGen.selectCompareTab('result')
      postGen.assertSelectedPhotoBookmarked()
    })
  })

  describe('Download (Logo and VS Label)', () => {
    it('downloads the origin photo as a usable image file', () => {
      revisitResultPage()
      postGen.selectOriginPhotoInCarousel()
      postGen.triggerDownloadWithOptions({ enableLogo: false, enableVsLabel: false })
      postGen.assertDownloadReady()
    })

    it('downloads a usable image file with Logo and VS Label options', () => {
      revisitResultPage()
      postGen.selectGeneratedResultPhoto()
      postGen.triggerDownloadWithOptions({ enableLogo: true, enableVsLabel: true })
      postGen.assertDownloadReady()
    })
  })

  describe('Compare', () => {
    it('displays Original, Reference, and Result images correctly', () => {
      ensureResultPageReady()
      postGen.openCompareMode()

      postGen.selectCompareTab('original')
      postGen.assertHeroImageVisible()
      postGen.captureHeroImageSrc('originImageSrc')

      postGen.selectCompareTab('reference')
      postGen.assertHeroImageVisible()
      postGen.captureHeroImageSrc('referenceImageSrc')

      postGen.selectCompareTab('result')
      postGen.assertHeroImageVisible()
      postGen.captureHeroImageSrc('resultImageSrc')

      cy.get('@originImageSrc').then((origin) => {
        cy.get('@referenceImageSrc').then((reference) => {
          cy.get('@resultImageSrc').then((result) => {
            expect(origin, 'origin image src').to.be.a('string').and.not.be.empty
            expect(reference, 'reference image src').to.be.a('string').and.not.be.empty
            expect(result, 'result image src').to.be.a('string').and.not.be.empty
          })
        })
      })
    })

    it('navigates between images with arrow keys', () => {
      revisitResultPage()
      postGen.flow.dismissBlockingModals()
      postGen.selectOriginPhotoInCarousel()

      postGen.captureHeroImageSrc('carouselStartHero')

      postGen.clickCarouselArrow('right')
      postGen.captureHeroImageSrc('carouselRightHero')

      postGen.clickCarouselArrow('left')
      postGen.captureHeroImageSrc('carouselLeftHero')

      cy.get('@carouselStartHero').then((start) => {
        cy.get('@carouselRightHero').then((right) => {
          cy.get('@carouselLeftHero').then((left) => {
            expect(start, 'starting hero image').to.be.a('string').and.not.be.empty
            expect(right, 'right arrow should change hero image').to.not.equal(start)
            expect(
              left === start || left !== right,
              'left arrow should move back toward the starting image',
            ).to.be.true
          })
        })
      })
    })

    it('shows no overlay on the Original image', () => {
      ensureResultPageReady()
      postGen.openCompareMode()
      postGen.selectCompareTab('original')
      postGen.assertNoDimOverlayOnHero()
    })
    it('opens and closes full screen view for the hero image', () => {
      revisitResultPage()
      postGen.openFullScreen()
      postGen.assertFullScreenOpen()
      postGen.closeFullScreen()
      postGen.assertDownloadReady()
    })
  })

  describe('Feedback', () => {
    it('applies feedback to one photo and leaves other photos unaffected', () => {
      revisitResultPage()
      postGen.restoreResultToolbar()
      postGen.selectPhotoByIndex(0)

      postGen.submitFeedbackForCurrentPhoto('Post-gen feedback — photo 1 only.')
      postGen.assertFeedbackSubmitted()

      postGen.getVisibleResultThumbnails().then(($thumbs) => {
        if ($thumbs.length < 2) {
          cy.log('Single result thumbnail — feedback submission verified on selected photo')
          return
        }

        postGen.selectPhotoByIndex(1)
        postGen.assertFeedbackNotSubmitted()
      })
    })
  })
})
