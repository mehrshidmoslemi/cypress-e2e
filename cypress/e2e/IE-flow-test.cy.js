/**
 * IE-flow-test
 */

describe('IE-flow-test', () => {
    it('completes IE flow', () => {
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
      cy.get('#v5-home-tool-image-enhancement-card').click()
  
      // Upload image
      cy.get('input[type="file"]').selectFile('cypress/fixtures/images/IE-indoor-test.jpg', {
        force: true,
      }).wait(7000)
  
      //generate button click
      cy.get('#v5-service-image-enhancement-generate-button').click().wait(30000)
  
      // clicking on first result
      cy.get('div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden').first().click()
  
      //download button modal
      cy.get('#v5-resultpage-primary-download-button').click()
  
      //normal download 
      cy.get('#v5-resultpage-downloadmodule-downloadbutton-sec').click().wait(10000)
  
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
      cy.contains('AI Image Enhancement').click()
  
      //selecting outdoor option
      cy.contains('Outdoor').click()
  
      //generate button click
      cy.get('#v5-service-image-enhancement-generate-button').click().wait(30000)
  
    
    })
  })
  