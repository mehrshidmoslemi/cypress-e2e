/**
 * WC-flow-test
 */

describe('WC-flow-test', () => {
    it('completes WC flow', () => {
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
      cy.get('a[href="/generate"]').contains('Start Now').click()
  
      // Upload image
      cy.get('input[type="file"]').selectFile('cypress/fixtures/images/WC-test.jpg', {
        force: true,
      }).wait(7000)

      //slecting service
      cy.get('#v5-services-page-AI Wall Change').click()
  
      // selecting space drop down
      cy.contains('button', 'Select').find('span.i-tabler\\:chevron-down').click()

      //selecting space
      cy.get('#v5-tool-wall-change-space-bathroom').click()

      //selecting style drop down
      cy.contains('button', 'Brick Wall').find('span.i-tabler\\:chevron-down').click()
  
      //selecting style
      cy.get('#v5-tool-wall-change-material-white-brick-wall').click()
  
      //generate button click
      cy.get('#v5-tool-wall-change-generate-button').click()
  
      // clicking on first result
      cy.get('div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden').first().click()
  
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
      cy.contains('AI Wall Change').click()
  
      // selecting space drop down
      cy.contains('button', 'Select').find('span.i-tabler\\:chevron-down').click().wait(1000)
  
      //selecting space
      cy.get('#v5-tool-wall-change-space-bedroom').click()
  
      // selecting style
      cy.get('button').contains('Brick Wall').click()
  
      //selecting style 
      cy.get('#v5-tool-wall-change-material-navy-blue-wall').click()
  
      //generate button click
      cy.get('#v5-tool-wall-change-generate-button').click().wait(30000)
  
      
    })
  })
  