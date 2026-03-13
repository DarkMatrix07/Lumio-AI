import { test, expect } from '@playwright/test'
import path from 'path'

const ARTIFACTS_DIR = path.join('artifacts', 'ui-review')

test.describe('Lumio AI UI Review', () => {
  test('capture full UI state', async ({ page }) => {
    // Set viewport to a large size for full page capture
    await page.setViewportSize({ width: 1600, height: 900 })

    // Step 1: Navigate to app root (should redirect to /builder)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const currentUrl = page.url()
    expect(currentUrl).toContain('/builder')
    await expect(page.getByTestId('builder-studio-shell')).toBeVisible()
    await expect(page.getByTestId('builder-canvas-panel')).toBeVisible()
    await expect(page.getByTestId('builder-chat-panel')).toBeVisible()
    await expect(page.getByTestId('chat-input')).toBeVisible()

    // Step 2: Full-page screenshot of the builder page
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/01-builder-full-page.png`,
      fullPage: true,
    })
    console.log('Screenshot 1: Full builder page captured')

    // Log page title and any console errors
    const title = await page.title()
    console.log('Page title:', title)

    // Collect any visible text to understand layout
    const bodyText = await page.locator('body').innerText().catch(() => 'Could not get body text')
    console.log('Body text (first 500 chars):', bodyText.substring(0, 500))

    // Step 3: Screenshot of the chat panel area
    // Try common chat panel selectors
    const chatPanelSelectors = [
      '[data-testid="chat-panel"]',
      '[data-testid="chat"]',
      '.chat-panel',
      '#chat-panel',
      '[class*="chat"]',
      '[id*="chat"]',
      'aside',
      '[role="complementary"]',
    ]

    let chatPanel = null
    for (const selector of chatPanelSelectors) {
      const el = page.locator(selector).first()
      const count = await el.count()
      if (count > 0) {
        console.log(`Found chat panel with selector: ${selector}`)
        chatPanel = el
        break
      }
    }

    if (chatPanel) {
      await chatPanel.screenshot({
        path: `${ARTIFACTS_DIR}/02-chat-panel.png`,
      })
      console.log('Screenshot 2: Chat panel captured')
    } else {
      console.log('Chat panel not found with known selectors, capturing left half of screen')
      await page.screenshot({
        path: `${ARTIFACTS_DIR}/02-chat-panel-fallback.png`,
        clip: { x: 0, y: 0, width: 400, height: 900 },
      })
    }

    // Step 4: Screenshot of the backend block panel area
    const backendPanelSelectors = [
      '[data-testid="backend-panel"]',
      '[data-testid="block-panel"]',
      '[data-testid="blocks"]',
      '[data-testid="sidebar"]',
      '.block-panel',
      '#block-panel',
      '[class*="block"]',
      '[class*="sidebar"]',
      'nav',
    ]

    let backendPanel = null
    for (const selector of backendPanelSelectors) {
      const el = page.locator(selector).first()
      const count = await el.count()
      if (count > 0) {
        console.log(`Found backend panel with selector: ${selector}`)
        backendPanel = el
        break
      }
    }

    if (backendPanel) {
      await backendPanel.screenshot({
        path: `${ARTIFACTS_DIR}/03-backend-panel.png`,
      })
      console.log('Screenshot 3: Backend block panel captured')
    } else {
      console.log('Backend panel not found, capturing right side of screen')
      await page.screenshot({
        path: `${ARTIFACTS_DIR}/03-backend-panel-fallback.png`,
        clip: { x: 1200, y: 0, width: 400, height: 900 },
      })
    }

    // Step 5: Screenshot of the canvas area
    const canvasSelectors = [
      '[data-testid="canvas"]',
      '[data-testid="flow-canvas"]',
      '.canvas',
      '#canvas',
      '[class*="canvas"]',
      '.react-flow',
      '[class*="flow"]',
      'main',
      '[role="main"]',
    ]

    let canvas = null
    for (const selector of canvasSelectors) {
      const el = page.locator(selector).first()
      const count = await el.count()
      if (count > 0) {
        console.log(`Found canvas with selector: ${selector}`)
        canvas = el
        break
      }
    }

    if (canvas) {
      await canvas.screenshot({
        path: `${ARTIFACTS_DIR}/04-canvas.png`,
      })
      console.log('Screenshot 4: Canvas area captured')
    } else {
      console.log('Canvas not found, capturing center of screen')
      await page.screenshot({
        path: `${ARTIFACTS_DIR}/04-canvas-fallback.png`,
        clip: { x: 400, y: 0, width: 800, height: 900 },
      })
    }

    // Step 6: Click the settings toggle in the chat panel and screenshot it
    const settingsSelectors = [
      '[data-testid="settings-toggle"]',
      '[data-testid="settings"]',
      '[aria-label*="settings" i]',
      '[title*="settings" i]',
      'button[class*="settings"]',
      '[class*="settings"] button',
      'button svg[class*="gear"]',
      'button svg[class*="cog"]',
      'button svg[class*="settings"]',
    ]

    let settingsToggle = null
    for (const selector of settingsSelectors) {
      const el = page.locator(selector).first()
      const count = await el.count()
      if (count > 0) {
        console.log(`Found settings toggle with selector: ${selector}`)
        settingsToggle = el
        break
      }
    }

    if (settingsToggle) {
      await settingsToggle.click()
      await expect(page.getByTestId('chat-settings')).toBeVisible()
      await page.screenshot({
        path: `${ARTIFACTS_DIR}/05-settings-panel-open.png`,
        fullPage: true,
      })
    } else {
      throw new Error('Settings toggle not found')
    }

    // Dump all interactive elements for analysis
    const allButtons = await page.locator('button').all()
    console.log(`Total buttons found: ${allButtons.length}`)
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].innerText().catch(() => '')
      const testId = await allButtons[i].getAttribute('data-testid').catch(() => '')
      const ariaLabel = await allButtons[i].getAttribute('aria-label').catch(() => '')
      const classes = await allButtons[i].getAttribute('class').catch(() => '')
      console.log(`Button ${i}: text="${text}" testid="${testId}" aria-label="${ariaLabel}" classes="${classes?.substring(0, 80)}"`)
    }

    // Dump all main structural elements
    const structuralElements = await page.locator('main, aside, nav, header, footer, [role="main"], [role="complementary"], [role="navigation"]').all()
    console.log(`Total structural elements found: ${structuralElements.length}`)
    for (let i = 0; i < structuralElements.length; i++) {
      const tag = await structuralElements[i].evaluate(el => el.tagName)
      const id = await structuralElements[i].getAttribute('id').catch(() => '')
      const classes = await structuralElements[i].getAttribute('class').catch(() => '')
      const testId = await structuralElements[i].getAttribute('data-testid').catch(() => '')
      const box = await structuralElements[i].boundingBox()
      console.log(`Element ${i}: <${tag}> id="${id}" testid="${testId}" classes="${classes?.substring(0, 80)}" box=${JSON.stringify(box)}`)
    }

    // Get all divs with explicit IDs or test IDs
    const namedDivs = await page.locator('[id], [data-testid]').all()
    console.log(`Total elements with id or data-testid: ${namedDivs.length}`)
    for (let i = 0; i < Math.min(namedDivs.length, 50); i++) {
      const tag = await namedDivs[i].evaluate(el => el.tagName)
      const id = await namedDivs[i].getAttribute('id').catch(() => '')
      const testId = await namedDivs[i].getAttribute('data-testid').catch(() => '')
      const box = await namedDivs[i].boundingBox()
      console.log(`Named element ${i}: <${tag}> id="${id}" testid="${testId}" box=${JSON.stringify(box)}`)
    }
  })
})
