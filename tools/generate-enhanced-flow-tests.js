/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', 'cypress', 'e2e')

const loginFirstTemplate = (cfg) => `/**
 * ${cfg.name}-flow-test (Enhanced)
 *
 * Single flow: Login → Upload → Validation → Widget dependency →
 * Gen-1 (credit −1) → Before/After → Download → Feedback →
 * Regenerate (no credit deduction) → Bookmark
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
${cfg.selBlock}
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: '${cfg.sessionId}',
${cfg.helperOptions}
})

${cfg.extraHelpers || ''}

const openToolSidebar = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    const sidebarItem = $body.find('span.text-body-md.text-darkest').filter((_, el) =>
      el.textContent.includes('${cfg.sidebarLabel}'),
    )
    if (sidebarItem.length) {
      cy.wrap(sidebarItem.first())
        .closest('div.cursor-pointer.items-center.justify-between')
        .click({ force: true })
    } else {
      cy.contains('${cfg.sidebarLabel}', { timeout: 60000 }).click({ force: true })
    }
  })
  cy.get(SEL.generateBtn, { timeout: 90000 }).should('be.visible')
}

describe('${cfg.name}-flow-test-enhanced', () => {
${cfg.beforeEachHook || ''}  it('completes full ${cfg.name} flow in a single generation', () => {
    flow.watchCreditApi('creditApi')
    flow.ensureLoggedIn()
    cy.visit('/')
    cy.wait('@creditApi')
    cy.get('nav', { timeout: 60000 }).should('exist')
    cy.get(SEL.profileMenuTrigger, { timeout: 30000 }).should('exist')
    flow.dismissBlockingModals()

    flow.getCreditBalanceFromApi('creditApi').then(() => {
${cfg.openToolSteps}

      flow.waitForUploadComplete()
${cfg.preGenValidationSteps || ''}
${cfg.gen1ConfigSteps}

      flow.readCreditBalance().then((beforeGen1Credits) => {
        cy.log(\`Credit before Gen-1: \${beforeGen1Credits}\`)

        flow.clickGenerate()
        flow.waitForAllResultsReady()

        flow.assertCreditAfterAction(
          beforeGen1Credits,
          -1,
          'first generate should deduct 1 credit',
        ).then(() => {
          flow.runLoginFirstPostGen1({ upscale: ${cfg.upscale}, feedbackMessage: '${cfg.feedbackMessage}' })

${cfg.gen2Steps}

          flow.readCreditBalance().then((beforeRegenCredits) => {
            cy.log(\`Credit count before regenerate: \${beforeRegenCredits}\`)

            flow.clickGenerate(${cfg.gen2ClickGenerateArgs || ''})
            flow.waitForAllResultsReady({ isRegenerate: true${cfg.gen2WaitExtra || ''} })

            flow.assertCreditAfterAction(
              beforeRegenCredits,
              0,
              'regenerate should NOT deduct any credits',
            ).then(() => {
              cy.log('Regenerate credit check passed')
              flow.manageBookmarks()
            })
          })
        })
      })
    })
  })
})
`

const generateBeforeLoginTemplate = (cfg) => `/**
 * ${cfg.name}-flow-test (Enhanced)
 *
 * Flow preserved: ${cfg.preLoginHeaderNote || 'Upload → Validation → Widget dependency → Gen-1 → Login → enhanced result page checks → Gen-2'}
 */

const { COMMON_SEL, createEnhancedFlowHelpers } = require('../support/flow-enhanced-shared')

const SEL = {
  ...COMMON_SEL,
${cfg.selBlock}
}

const flow = createEnhancedFlowHelpers({
  sel: SEL,
  sessionId: '${cfg.sessionId}',
${cfg.helperOptions}
})

${cfg.extraHelpers || ''}

const openToolSidebar = () => {
  cy.contains('span.text-body-md.text-darkest', '${cfg.sidebarLabel}')
    .closest('div.cursor-pointer.items-center.justify-between')
    .should('be.visible')
    .click({ force: true })
}

describe('${cfg.name}-flow-test-enhanced', () => {
${cfg.beforeEachHook || ''}  it('completes full ${cfg.name} flow in a single generation', () => {
    cy.visit('/')
    flow.dismissBlockingModals()

${cfg.preLoginSteps}

    flow.clickGenerate(${cfg.gen1ClickGenerateArgs || ''})
    flow.watchCreditApi('creditApi')
    flow.loginAfterGenerateIfNeeded()
    cy.wait('@creditApi', { timeout: 60000 })

    flow.readCreditBalance().then((creditsAfterLogin) => {
      cy.log(\`Credit after login: \${creditsAfterLogin}\`)

      flow.waitForAllResultsReady({ skipGenerateRetry: true${cfg.gen1WaitExtra || ''} })

      flow.assertCreditAfterAction(
        creditsAfterLogin,
        -1,
        'first generate should deduct 1 credit',
      ).then(() => {
        flow.runResultPageEnhancements({ upscale: ${cfg.upscale}, feedbackMessage: '${cfg.feedbackMessage}' })

${cfg.gen2Steps}

        flow.readCreditBalance().then((beforeGen2Credits) => {
          flow.clickGenerate(${cfg.gen2ClickGenerateArgs || ''})
          flow.waitForAllResultsReady({ isRegenerate: true${cfg.gen2WaitExtra || ''} })

          flow.assertCreditAfterAction(
            beforeGen2Credits,
            0,
            'second generate should NOT deduct any credits',
          ).then(() => {
            flow.manageBookmarks()
          })
        })
      })
    })
  })
})
`

const configs = [
  {
    file: 'CC-flow-test-enhanced.cy.js',
    template: loginFirstTemplate,
    cfg: {
      name: 'CC',
      sessionId: 'cc-flow-user-10000',
      sidebarLabel: 'AI Ceiling Change',
      upscale: true,
      feedbackMessage: 'Great ceiling result. Texture and lighting look realistic.',
      helperOptions: `  materialDropdownLabels: ['Wooden Ceiling', 'White Coffered', 'Coffered Wooden', 'Grey Marble'],`,
      selBlock: `  homeCard: '#v5-home-tool-ceiling-change',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-ceiling-change-generate-button',
  spaceLivingRoom: '#v5-tool-ceiling-change-space-living-room',
  spaceOffice: '#v5-tool-ceiling-change-space-office',
  materialCofferedWooden: '#v5-tool-ceiling-change-material-coffered-wooden',
  materialWhiteCoffered: '#v5-tool-ceiling-change-material-white-coffered',`,
      openToolSteps: `      flow.dismissBlockingModals()
      cy.get(SEL.homeCard).scrollIntoView().click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/CC-test.jpeg', { force: true })`,
      preGenValidationSteps: `      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceMaterialDependency(SEL.spaceLivingRoom, SEL.materialCofferedWooden)`,
      gen1ConfigSteps: `      flow.dismissBlockingModals()
      flow.selectMaterial(SEL.materialCofferedWooden)`,
      gen2Steps: `          openToolSidebar()
          flow.selectSpace(SEL.spaceOffice, 1000)
          flow.selectMaterial(SEL.materialWhiteCoffered)`,
    },
  },
  {
    file: 'D2D-flow-test-enhanced.cy.js',
    template: loginFirstTemplate,
    cfg: {
      name: 'D2D',
      sessionId: 'd2d-flow-user-10000',
      sidebarLabel: 'AI Day to Dusk',
      upscale: false,
      feedbackMessage: 'Great day-to-dusk result. Sky transition looks natural.',
      helperOptions: '',
      extraHelpers: `const selectSkyStyle = (skyStyleSelector) => {
  flow.dismissBlockingModals()
  cy.contains('span.text-title-sm', 'Sky Style').click({ force: true })
  cy.get(skyStyleSelector).click({ force: true })
  flow.closeOpenDropdown()
}`,
      selBlock: `  homeCard: '#v5-home-tool-day-to-dusk-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-day-to-dusk-generate-button',
  skyStyleTwilight: '#v5-tool-day-to-dusk-sky-style-twilight-without-cloud',`,
      openToolSteps: `      flow.dismissBlockingModals()
      cy.get(SEL.homeCard).click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/D2D-test.png', { force: true })`,
      gen1ConfigSteps: `      flow.dismissBlockingModals()`,
      gen2Steps: `          openToolSidebar()
          selectSkyStyle(SEL.skyStyleTwilight)`,
    },
  },
  {
    file: 'FC-flow-test-enhanced.cy.js',
    template: loginFirstTemplate,
    cfg: {
      name: 'FC',
      sessionId: 'fc-flow-user-10000',
      sidebarLabel: 'AI Floor Change',
      upscale: true,
      feedbackMessage: 'Great floor change result. Material looks realistic.',
      helperOptions: `  materialDropdownLabels: ['Cream Marble', 'Brown Marble', 'Grey Marble', 'Modern'],`,
      extraHelpers: `const selectFCService = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    if ($body.find(SEL.fcService).length) {
      cy.get(SEL.fcService).click({ force: true })
      return
    }
    cy.contains('span.text-body-md.text-darkest', 'AI Floor Change')
      .closest('div.cursor-pointer')
      .click({ force: true })
  })
}`,
      selBlock: `  startNowLink: 'a[href="/generate"]',
  fcService: '[id="v5-services-page-AI Floor Change"]',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-floor-change-generate-button',
  spaceKitchen: '#v5-tool-floor-change-space-kitchen',
  spaceDiningRoom: '#v5-tool-floor-change-space-dining-room',
  materialCreamMarble: '#v5-tool-floor-change-material-cream-marble',
  materialBrownMarble: '#v5-tool-floor-change-material-brown-marble',`,
      openToolSteps: `      flow.dismissBlockingModals()
      cy.get(SEL.startNowLink).contains('Start Now').click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/FC-test.jpg', { force: true })
      selectFCService()`,
      preGenValidationSteps: `      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceMaterialDependency(SEL.spaceKitchen, SEL.materialCreamMarble)`,
      gen1ConfigSteps: `      flow.dismissBlockingModals()
      flow.selectMaterial(SEL.materialCreamMarble)`,
      gen2Steps: `          openToolSidebar()
          flow.selectSpace(SEL.spaceDiningRoom, 1000)
          flow.selectMaterial(SEL.materialBrownMarble)`,
    },
  },
  {
    file: 'FR-flow-test-enhanced.cy.js',
    template: loginFirstTemplate,
    cfg: {
      name: 'FR',
      sessionId: 'fr-flow-user-10000',
      sidebarLabel: 'AI Furniture Restyle',
      upscale: true,
      feedbackMessage: 'Great furniture restyle result. Style looks cohesive.',
      helperOptions: `  styleDropdownLabels: ['Contemporary', 'Scandinavian', 'Modern', 'Prime'],`,
      extraHelpers: `const selectFRService = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    if ($body.find(SEL.frService).length) {
      cy.get(SEL.frService).click({ force: true })
      return
    }
    cy.contains('span.text-body-md.text-darkest', 'AI Furniture Restyle')
      .closest('div.cursor-pointer')
      .click({ force: true })
  })
}`,
      selBlock: `  startNowLink: 'a[href="/generate"]',
  frService: '[id="v5-services-page-AI Furniture Restyle"]',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-furniture-restyle-generate-button',
  spaceBedroom: '#v5-tool-furniture-restyle-space-bedroom',
  spaceOffice: '#v5-tool-furniture-restyle-space-office',
  styleContemporary: '#v5-tool-furniture-restyle-style-contemporary',
  styleScandinavian: '#v5-tool-furniture-restyle-style-scandinavian',`,
      openToolSteps: `      flow.dismissBlockingModals()
      cy.get(SEL.startNowLink).contains('Start Now').click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/FR-test.jpg', { force: true })
      selectFRService()`,
      preGenValidationSteps: `      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceStyleDependency(SEL.spaceBedroom, SEL.styleContemporary)`,
      gen1ConfigSteps: `      flow.dismissBlockingModals()
      flow.selectStyle(SEL.styleContemporary)`,
      gen2Steps: `          openToolSidebar()
          flow.selectSpace(SEL.spaceOffice, 1000)
          flow.selectStyle(SEL.styleScandinavian)`,
    },
  },
  {
    file: 'UC-flow-test-enhanced.cy.js',
    template: loginFirstTemplate,
    cfg: {
      name: 'UC',
      sessionId: 'uc-flow-user-10000',
      sidebarLabel: 'AI Under Construction',
      upscale: true,
      feedbackMessage: 'Great under-construction result. Finish looks realistic.',
      helperOptions: `  styleDropdownLabels: ['Contemporary', 'Hampton', 'Modern', 'Prime'],`,
      selBlock: `  homeCard: '#v5-home-tool-under-construction',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-under-construction-generate-button',
  spaceLivingRoom: '#v5-tool-under-construction-space-living-room',
  spaceOutdoor: '#v5-tool-under-construction-space-outdoor',
  styleContemporary: '#v5-tool-under-construction-style-contemporary',
  styleHampton: '#v5-tool-under-construction-style-hampton',`,
      openToolSteps: `      flow.dismissBlockingModals()
      cy.get(SEL.homeCard).click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/UC-test.jpg', { force: true })`,
      preGenValidationSteps: `      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceStyleDependency(SEL.spaceLivingRoom, SEL.styleContemporary)`,
      gen1ConfigSteps: `      flow.dismissBlockingModals()
      flow.selectStyle(SEL.styleContemporary)`,
      gen2Steps: `          openToolSidebar()
          flow.selectSpace(SEL.spaceOutdoor, 1000)
          flow.selectStyle(SEL.styleHampton)`,
    },
  },
  {
    file: 'IE-flow-test-enhanced.cy.js',
    template: loginFirstTemplate,
    cfg: {
      name: 'IE',
      sessionId: 'ie-flow-user-10000',
      sidebarLabel: 'AI Image Enhancement',
      upscale: false,
      feedbackMessage: 'Great image enhancement result. Details look sharper.',
      beforeEachHook: `  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

`,
      helperOptions: '',
      extraHelpers: `const selectOutdoor = () => {
  flow.dismissBlockingModals()
  cy.get(SEL.generateBtn)
    .parents()
    .find('button, [role="tab"], div')
    .filter(':visible')
    .then(($els) => {
      const outdoor = [...$els].find((el) => el.textContent?.trim() === 'Outdoor')
      if (outdoor) {
        cy.wrap(outdoor).click({ force: true })
        return
      }
      cy.contains('Outdoor').click({ force: true })
    })
}`,
      selBlock: `  homeCard: '#v5-home-tool-image-enhancement-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-service-image-enhancement-generate-button',`,
      openToolSteps: `      flow.dismissBlockingModals()
      cy.get(SEL.homeCard).click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/IE-indoor-test.jpg', { force: true })`,
      gen1ConfigSteps: `      flow.dismissBlockingModals()`,
      gen2Steps: `          openToolSidebar()
          selectOutdoor()`,
    },
  },
  {
    file: 'WC-flow-test-enhanced.cy.js',
    template: loginFirstTemplate,
    cfg: {
      name: 'WC',
      sessionId: 'wc-flow-user-10000',
      sidebarLabel: 'AI Wall Change',
      upscale: true,
      feedbackMessage: 'Great wall change result. Material looks realistic.',
      helperOptions: `  materialDropdownLabels: ['White Brick Wall', 'Navy Blue Wall', 'Grey Marble', 'Modern'],`,
      extraHelpers: `const selectWCService = () => {
  flow.dismissBlockingModals()
  cy.get('body').then(($body) => {
    if ($body.find(SEL.wcService).length) {
      cy.get(SEL.wcService).click({ force: true })
      return
    }
    cy.contains('span.text-body-md.text-darkest', 'AI Wall Change')
      .closest('div.cursor-pointer')
      .click({ force: true })
  })
}`,
      selBlock: `  startNowLink: 'a[href="/generate"]',
  wcService: '[id="v5-services-page-AI Wall Change"]',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-wall-change-generate-button',
  spaceBathroom: '#v5-tool-wall-change-space-bathroom',
  spaceBedroom: '#v5-tool-wall-change-space-bedroom',
  materialWhiteBrick: '#v5-tool-wall-change-material-white-brick-wall',
  materialNavyBlue: '#v5-tool-wall-change-material-navy-blue-wall',`,
      openToolSteps: `      flow.dismissBlockingModals()
      cy.get(SEL.startNowLink).contains('Start Now').click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/WC-test.jpg', { force: true })
      selectWCService()`,
      preGenValidationSteps: `      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceMaterialDependency(SEL.spaceBathroom, SEL.materialWhiteBrick)`,
      gen1ConfigSteps: `      flow.dismissBlockingModals()
      flow.selectMaterial(SEL.materialWhiteBrick)`,
      gen2Steps: `          openToolSidebar()
          flow.selectSpace(SEL.spaceBedroom, 1000)
          flow.selectMaterial(SEL.materialNavyBlue)`,
    },
  },
  {
    file: 'ID-flow-test-enhanced.cy.js',
    template: loginFirstTemplate,
    cfg: {
      name: 'ID',
      sessionId: 'id-flow-user-10000',
      sidebarLabel: 'AI Interior Design',
      upscale: true,
      feedbackMessage: 'Great interior design result. Layout and style look cohesive.',
      beforeEachHook: `  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes("reading 'error'")) {
        return false
      }
    })
  })

`,
      helperOptions: `  styleDropdownLabels: ['Industrial', 'Traditional', 'Modern', 'Contemporary'],`,
      extraHelpers: `const openColorDropdownAndWait = (waitMs = 3000) => {
  flow.dismissBlockingModals()
  cy.contains('Color (Optional)').click({ force: true })
  cy.wait(waitMs)
  flow.closeOpenDropdown()
}`,
      selBlock: `  homeCard: '#v5-home-tool-interior-design',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-interior-design-generate-button',
  spaceLivingRoom: '#v5-tool-interior-design-space-living-room',
  spaceKidsRoom: '#v5-tool-interior-design-space-kids-room',
  styleIndustrial: '#v5-tool-interior-design-style-industrial',
  styleTraditional: '#v5-tool-interior-design-style-traditional',`,
      openToolSteps: `      flow.dismissBlockingModals()
      cy.get(SEL.homeCard).scrollIntoView().click({ force: true })
      cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/ID-test.jpg', { force: true })`,
      preGenValidationSteps: `      cy.log('Testing validation error...')
      flow.clickGenerate()
      flow.verifyValidationError()
      flow.dismissBlockingModals()
      flow.verifySpaceStyleDependency(SEL.spaceLivingRoom, SEL.styleIndustrial)`,
      gen1ConfigSteps: `      flow.dismissBlockingModals()
      flow.selectStyle(SEL.styleIndustrial)
      openColorDropdownAndWait(3000)`,
      gen2Steps: `          openToolSidebar()
          flow.selectSpace(SEL.spaceKidsRoom, 1000)
          flow.selectStyle(SEL.styleTraditional)`,
    },
  },
  {
    file: 'IR-flow-test-enhanced.cy.js',
    template: generateBeforeLoginTemplate,
    cfg: {
      name: 'IR',
      sessionId: 'ir-flow-user-10000',
      sidebarLabel: 'AI Item Removal',
      upscale: true,
      feedbackMessage: 'Great item removal result. Object removal looks clean.',
      helperOptions: '',
      selBlock: `  homeCard: '#v5-home-tool-item-removal-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-service-item-removal-generate-button',`,
      preLoginSteps: `    cy.get(SEL.homeCard).click({ force: true })

    cy.log('Testing upload required before generate...')
    cy.get('body').should(($body) => {
      const text = $body.text().toLowerCase()
      expect(
        text.includes('upload') || text.includes('drop') || text.includes('browse'),
        'upload prompt should be visible before image is added',
      ).to.be.true
    })
    cy.get('body').then(($body) => {
      if ($body.find(SEL.generateBtn).length > 0) {
        flow.clickGenerate()
        flow.verifyValidationError()
        flow.dismissBlockingModals()
      } else {
        cy.log('Generate button hidden until upload — upload requirement verified')
      }
    })

    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/IR-test.jpg', { force: true })
    flow.waitForUploadComplete()`,
      preLoginHeaderNote: 'Upload required before generate',
      gen2Steps: `      openToolSidebar()`,
    },
  },
  {
    file: 'VS-flow-test-enhanced.cy.js',
    template: generateBeforeLoginTemplate,
    cfg: {
      name: 'VS',
      sessionId: 'vs-flow-user-10000',
      sidebarLabel: 'AI Virtual Staging',
      upscale: true,
      feedbackMessage: 'Great virtual staging result. Furniture placement looks natural.',
      helperOptions: `  styleDropdownLabels: ['Prime', 'Modern', 'Hampton', 'Contemporary', 'Scandinavian'],`,
      extraHelpers: `const selectSpaceById = (spaceId, waitMs = 1000) => {
  flow.dismissBlockingModals()
  cy.contains('Space').parents().find('button span.i-tabler\\\\:chevron-down').first().click({ force: true })
  cy.wait(waitMs)
  cy.get(\`#\${spaceId}\`).click({ force: true })
  flow.closeOpenDropdown()
}

const selectStyleById = (styleId) => {
  flow.dismissBlockingModals()
  cy.get('button').then(($buttons) => {
    const styleLabels = ['Prime', 'Modern', 'Hampton', 'Contemporary', 'Scandinavian']
    const target = [...$buttons].find((button) =>
      styleLabels.some((label) => button.innerText.trim().includes(label)),
    )
    expect(target, 'style dropdown button').to.exist
    cy.wrap(target).click({ force: true })
  })
  cy.wait(800)
  cy.get(\`#\${styleId}\`).click({ force: true })
  flow.closeOpenDropdown()
}`,
      selBlock: `  homeCard: '#v5-home-tool-virtual-staging-card',
  fileInput: 'input[type="file"]',
  generateBtn: '#v5-tool-virtual-staging-generate-button',
  restageGenerateBtn: '#v5-tool-virtual-restaging-generate-button',
  spaceStudio: '#v5-tool-virtual-staging-space-studio',
  styleHampton: '#v5-tool-virtual-staging-style-hampton',`,
      preLoginSteps: `    cy.get(SEL.homeCard).click({ force: true })
    cy.get(SEL.fileInput).selectFile('cypress/fixtures/images/vs-test-room.jpg', { force: true })
    flow.waitForUploadComplete()
    flow.dismissBlockingModals()

    cy.log('Testing validation error...')
    flow.clickGenerate()
    flow.verifyValidationError()
    flow.dismissBlockingModals()
    flow.verifySpaceStyleDependency(SEL.spaceStudio, SEL.styleHampton)`,
      gen2Steps: `      cy.contains('span.text-body-md.text-darkest', 'AI Virtual Staging')
        .closest('div.cursor-pointer.items-center.justify-between')
        .click({ force: true })
      selectSpaceById('v5-tool-virtual-staging-space-living-room')
      selectStyleById('v5-tool-virtual-staging-style-hampton')`,
    },
  },
]

for (const { file, template, cfg } of configs) {
  const content = template(cfg)
  const outPath = path.join(OUT_DIR, file)
  fs.writeFileSync(outPath, content, 'utf8')
  console.log('Wrote', outPath)
}

console.log('Done.')
