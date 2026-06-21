describe('probe login signup nav', () => {
  it('finds switch links between login and signup modals', () => {
    cy.visit('/')
    cy.get('body').then(($body) => {
      if ($body.find('button[aria-label="Close"]').length) cy.get('button[aria-label="Close"]').click()
    })
    cy.get('body').then(($body) => {
      if ($body.text().includes('Accept all')) cy.contains('button', 'Accept all').click()
    })

    cy.contains('span', 'Login').click()
    cy.contains('button', 'Login').click()
    cy.contains('Welcome Back', { timeout: 15000 }).should('be.visible')

    cy.contains('button', 'Signup').click()
    cy.contains('Create Account', { timeout: 15000 }).should('be.visible')

    cy.contains('button', 'Login').click()
    cy.contains('Welcome Back').should('be.visible')
  })
})
