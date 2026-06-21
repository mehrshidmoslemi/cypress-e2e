/**
 * CC-flow-test
 */

describe('CC-flow-test', () => {
    it('completes CC flow', () => {
      // Visit site
      cy.visit('https://app.aihomedesign.com/')

       //login 
      //click on profile modal
      cy.contains('span', 'Login')
      .should('be.visible')
      .click()

      //click on login
      cy.contains('button', 'Login').click()

      //click on login with email button
      cy.get('#login-with-email-button').click()

      //email input
      cy.get('input[name="username"]')
      .type('memoslemi.sdstudio+1011@gmail.com')
  
      //password input
      cy.get('input[name="password"]')
      .type('12345678')
     
      //login button
      cy.get('#loginwithemail-login-button').click()

      // Wait until login overlay releases body (pointer-events: none)
      cy.get('body', { timeout: 60000 }).should(($body) => {
        expect($body.css('pointer-events')).to.not.equal('none')
      })
  
      // Go to uploader
      cy.get('#v5-home-tool-ceiling-change').scrollIntoView().click({ force: true })
  
      // Upload image
      cy.get('input[type="file"]').selectFile('cypress/fixtures/images/CC-test.jpeg', {
        force: true,
      }).wait(7000)

  
      // selecting space drop down
      cy.contains('button', 'Select').find('span.i-tabler\\:chevron-down').click()

      //selecting space
      cy.get('#v5-tool-ceiling-change-space-living-room').click()

      //selecting style drop down
      cy.contains('button', 'Wooden Ceiling').find('span.i-tabler\\:chevron-down').click()
  
      //selecting style
      cy.get('#v5-tool-ceiling-change-material-coffered-wooden').click()

      // close material panel (covers Generate)
      cy.contains('button', 'Living Room').click()
  
      //generate button click
      cy.contains('button', 'Generate').scrollIntoView().click()
  
      const resultThumbSelector = 'div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden'
      const resultDownloadSelector = '#v5-resultpage-primary-download-button'

      const waitForGeneratedResult = (timeoutMs) =>
        cy.get('body', { timeout: timeoutMs }).should(($body) => {
          const hasThumbnail = $body.find(resultThumbSelector).length > 0
          const hasDownloadButton = $body.find(resultDownloadSelector).length > 0
          expect(hasThumbnail || hasDownloadButton, 'generated result is available').to.be.true
        })

      // In some runs app stays on configure screen after first click; retry once before failing.
      cy.wait(60000)
      cy.get('body').then(($body) => {
        const hasThumbnail = $body.find(resultThumbSelector).length > 0
        const hasDownloadButton = $body.find(resultDownloadSelector).length > 0
        if (!hasThumbnail && !hasDownloadButton) {
          cy.contains('button', 'Generate').scrollIntoView().click({ force: true })
        }
      })
      waitForGeneratedResult(240000)

      // click thumbnail only when it exists; sometimes app opens result page directly
      cy.get('body').then(($body) => {
        if ($body.find(resultThumbSelector).length) {
          cy.get(resultThumbSelector).first().should('be.visible').click()
        }
      })
  
      //download button
      cy.get('#v5-resultpage-primary-download-button').click()
  
      //normal download 
      cy.get('#v5-resultpage-downloadmodule-downloadbutton-sec').click().wait(10000)
  
      //download button
      cy.get('#v5-resultpage-primary-download-button').click()
  
      //upscale button
      cy.get('#v5-resultpage-downloadmodule-upscale-download').click()
  
      //download button
      cy.get('#v5-resultpage-downloadmodule-downloadbutton-sec').click().wait(25000)
  
      //feedback button
      cy.get('span.i-tabler\\:thumb-up').closest('button').click()
  
      // clicking on mood button
      cy.get('span.i-tabler\\:mood-empty-filled').closest('button').click()
  
      //description input
      cy.get('textarea[placeholder="Description"]')
      .type('The image is clear and the colors are accurate.')
  
      //submit button
      cy.get('button.bg-primary-main').contains('Submit').click()
  
      //bookmark button
      cy.get('#v5-resultpage-bookmark').click()
  
      //regenerate flow
      cy.contains('AI Ceiling Change').click()
  
      // selecting space drop down
      cy.contains('button', 'Select').find('span.i-tabler\\:chevron-down').click().wait(1000)
  
      //selecting space
      cy.get('#v5-tool-ceiling-change-space-office').click()
  
      // selecting style
      cy.get('button').contains('Wooden Ceiling').click()
  
      //selecting style 
      cy.get('#v5-tool-ceiling-change-material-white-coffered').click()

      // close material panel
      cy.contains('button', 'Office').click()
  
      //generate button click
      cy.contains('button', 'Generate').click().wait(30000)
  
      
    })
  })
  