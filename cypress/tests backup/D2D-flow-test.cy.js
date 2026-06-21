/**
 * D2Dow-test
 */

describe('D2Dow-test', () => {
    it('completes D2D flow', () => {
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

      // Go to uploader
      cy.get('#v5-home-tool-day-to-dusk-card').click()
  
      // Upload image
      cy.get('input[type="file"]').selectFile('cypress/fixtures/images/D2D-test.png', {
        force: true,
      }).wait(7000)
  
      //generate button click
      cy.get('#v5-tool-day-to-dusk-generate-button').click()
  
      // clicking on first result
      cy.get('div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden').first().click()
  
      //download modal button
      cy.get('#v5-resultpage-primary-download-button').click()
  
      //download button
      cy.get('#v5-resultpage-downloadmodule-downloadbutton-sec').click()
  
      //feedback button
      cy.get('span.i-tabler\\:thumb-up').closest('button').click()
  
      // clicking on mood button
      cy.get('span.i-tabler\\:mood-empty-filled').closest('button').click()
  
      //description input
      cy.get('textarea[placeholder="Description"]')
      .type('The image is clear and the colors are accurate.')
  
      //submit button
      cy.get('button.bg-primary-main').contains('Submit').click()
  
      // verify feedback snackbar is shown
      cy.contains('[role="alert"][data-state="open"]', 'Feedback submitted successfully.', {
        timeout: 10000,
      }).should('be.visible')
  
      // wait for feedback snackbar to close before bookmark
      cy.get('[role="alert"][data-state="open"]').should('not.exist')
  
      //bookmark button
      cy.get('#v5-resultpage-bookmark').click()
  
      // verify bookmark snackbar is shown
      cy.contains('[role="alert"][data-state="open"]', /bookmark/i, { timeout: 10000 }).should(
        'be.visible',
      )
  
      //regenerate flow
      cy.contains('span.text-body-md.text-darkest', 'AI Day to Dusk')
        .closest('div.cursor-pointer.items-center.justify-between')
        .should('be.visible')
        .click()

      // Sky Style dropdown
      cy.contains('span.text-title-sm', 'Sky Style').click()
  
      //selecting sky style
      cy.get('#v5-tool-day-to-dusk-sky-style-twilight-without-cloud').click()
  
      //generate button click
      cy.get('#v5-tool-day-to-dusk-generate-button').click()
  
      
    
    })
  })
  