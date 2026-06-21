/**
 * VS-flow-test
 */

describe('VS-flow-test', () => {
  it('completes VS flow with 4 generations', () => {
    // Visit site
    cy.visit('https://app.aihomedesign.com/')

    // Go to uploader
    cy.get('#v5-home-tool-virtual-staging-card').click()

    // Upload image
    cy.get('input[type="file"]').selectFile('cypress/fixtures/images/vs-test-room.jpg', {
      force: true,
    }).wait(7000)

    // selecting space drop down
    cy.contains('button', 'Select').find('span.i-tabler\\:chevron-down').click().wait(5000)

    //selecting space (prime)
    cy.get('#v5-tool-virtual-staging-space-studio').click()

    //generate button click
    cy.get('#v5-tool-virtual-staging-generate-button').click()

    //logging in
    cy.get('#login-with-email-button').click()

    //email input
    cy.get('input[name="username"]')
    .type('memoslemi.sdstudio+1011@gmail.com')

    //password input
    cy.get('input[name="password"]')
    .type('12345678')
   
    //login button
    cy.get('#loginwithemail-login-button').click().wait(30000)

    // clicking on first result
    cy.get('div.relative.rounded-lg.w-full.h-full.cursor-pointer.overflow-hidden').first().click()

    //download button
    cy.get('#v5-resultpage-primary-download-button').click()

    //normal download 
    cy.get('#v5-resultpage-downloadmodule-downloadbutton-sec').click().wait(10000)

    //download button
    // cy.get('#v5-resultpage-primary-download-button').click()

    //upscale button
    // cy.get('#v5-resultpage-downloadmodule-upscale-download').click()

    //download button
    // cy.get('#v5-resultpage-downloadmodule-downloadbutton-sec').click().wait(25000)

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
    cy.contains('AI Virtual Staging').click()

    // selecting space drop down
    cy.contains('button', 'Select').find('span.i-tabler\\:chevron-down').click().wait(1000)

    //selecting space (non-prime)
    cy.get('#v5-tool-virtual-staging-space-living-room').click()

    // selecting style dropdown
    cy.get('button').contains('Prime').click()

    //selecting style (non-prime)
    cy.get('#v5-tool-virtual-staging-style-hampton').click()

    //generate button click
    cy.get('#v5-tool-virtual-staging-generate-button').click().wait(30000)

    //regenerate flow
    cy.contains('AI Virtual Staging').click()

    // selecting space drop down
    cy.contains('button', 'Select').find('span.i-tabler\\:chevron-down').click().wait(1000)

    //selecting space (non-prime)
    cy.get('#v5-tool-virtual-staging-space-living-room').click()

    // selecting style dropdown
    cy.get('button').contains('Prime').click()

    //selecting style (non-prime)
    cy.get('#v5-tool-virtual-staging-style-hampton').click()

    // remove furniture toggle on
    cy.get('#v5-service-ai-virtual-staging-ir-toggle').click()

    //generate button click
    cy.get('#v5-tool-virtual-restaging-generate-button').click().wait(30000)

    //regenerate flow
    cy.contains('AI Virtual Restaging').click()

    // selecting space drop down
    cy.contains('button', 'Select').find('span.i-tabler\\:chevron-down').click().wait(1000)

    //selecting space (prime)
    cy.get('#v5-tool-virtual-restaging-space-living+dining+bedroom').click()

    //generate button click
    cy.get('#v5-tool-virtual-restaging-generate-button').click().wait(30000)
  
  })
})
