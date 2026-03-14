import { expect, test } from '@playwright/test'

test.describe('Builder Studio — Shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder')
  })

  test('loads the builder page shell, canvas, and chat panels', async ({ page }) => {
    await expect(page.getByTestId('builder-studio-shell')).toBeVisible()
    await expect(page.getByTestId('builder-canvas-panel')).toBeVisible()
    await expect(page.getByTestId('builder-chat-panel')).toBeVisible()
  })

  test('loads the redesigned shell zones', async ({ page }) => {
    await expect(page.getByTestId('builder-command-rail')).toBeVisible()
    await expect(page.getByTestId('builder-primary-workspace')).toBeVisible()
    await expect(page.getByTestId('builder-assistant-workspace')).toBeVisible()
  })

  test('chat panel shows input and send button', async ({ page }) => {
    await expect(page.getByTestId('chat-input')).toBeVisible()
    await expect(page.getByTestId('chat-send-button')).toBeVisible()
  })

  test('send button is disabled when input is empty', async ({ page }) => {
    await expect(page.getByTestId('chat-send-button')).toBeDisabled()
  })

  test('send button enables after typing in input', async ({ page }) => {
    await page.getByTestId('chat-input').fill('Add a hero section')
    await expect(page.getByTestId('chat-send-button')).toBeEnabled()
  })

  test('settings toggle shows provider selector', async ({ page }) => {
    await page.getByTestId('chat-settings-toggle').click()
    await expect(page.getByTestId('chat-settings')).toBeVisible()
    await expect(page.getByTestId('chat-provider-select')).toBeVisible()
  })

  test('export zip button is present', async ({ page }) => {
    await expect(page.getByTestId('builder-export-zip')).toBeVisible()
  })

  test('canvas editor root is visible', async ({ page }) => {
    await expect(page.getByTestId('grapes-canvas-root')).toBeVisible()
  })

  test('chat panel empty state shows prompt hint', async ({ page }) => {
    const messages = page.getByTestId('chat-messages')
    await expect(messages).toContainText('Describe what you want to build')
  })
})

test.describe('Left Rail — Panel Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder')
  })

  test('left rail has all 7 navigation items', async ({ page }) => {
    const rail = page.getByTestId('builder-command-rail')
    for (const label of ['Add', 'Templates', 'Pages', 'Layers', 'Global', 'Code', 'Backend']) {
      await expect(rail.getByTitle(label)).toBeVisible()
    }
  })

  test('clicking Pages shows page management panel', async ({ page }) => {
    await page.getByTitle('Pages').click()
    await expect(page.getByText('+ New Page')).toBeVisible()
    await expect(page.getByText('Home')).toBeVisible()
  })

  test('clicking Code shows HTML/CSS editor', async ({ page }) => {
    await page.getByTitle('Code').click()
    await expect(page.getByText('HTML')).toBeVisible()
    await expect(page.getByText('CSS')).toBeVisible()
    await expect(page.getByText('Apply Changes')).toBeVisible()
    await expect(page.getByText('Refresh')).toBeVisible()
  })

  test('clicking Global shows CSS editor', async ({ page }) => {
    await page.getByTitle('Global').click()
    await expect(page.getByText('Custom CSS')).toBeVisible()
    await expect(page.getByText('Apply Global Styles')).toBeVisible()
  })

  test('clicking Backend shows coming-soon placeholder', async ({ page }) => {
    await page.getByTitle('Backend').click()
    await expect(page.getByText('Backend Builder')).toBeVisible()
  })

  test('toggling same rail item closes the panel', async ({ page }) => {
    // Add panel should be open by default
    await page.getByTitle('Add').click() // close it
    // Panel header should not be visible
    await expect(page.getByText('Add Elements')).not.toBeVisible()
  })
})

test.describe('Device Switcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder')
  })

  test('shows Desktop as default device', async ({ page }) => {
    await expect(page.getByText('Desktop · 1366px')).toBeVisible()
  })

  test('switching to Tablet updates device info', async ({ page }) => {
    await page.getByTitle('Tablet').click()
    await expect(page.getByText('Tablet · 768px')).toBeVisible()
  })

  test('switching to Mobile updates device info', async ({ page }) => {
    await page.getByTitle('Mobile').click()
    await expect(page.getByText('Mobile · 375px')).toBeVisible()
  })
})

test.describe('Top Bar — Undo/Redo', () => {
  test('undo and redo buttons are visible', async ({ page }) => {
    await page.goto('/builder')
    await expect(page.getByTitle('Undo (Ctrl+Z)')).toBeVisible()
    await expect(page.getByTitle('Redo (Ctrl+Y)')).toBeVisible()
  })
})

test.describe('Chat generate flow (mocked API)', () => {
  test('submitting a prompt shows user message and streaming indicator', async ({ page }) => {
    await page.route('/api/generate', async (route) => {
      const body = [
        JSON.stringify({ type: 'text', value: 'Building your navbar…' }),
        JSON.stringify({ type: 'html', value: '<nav>Nav</nav>' }),
        JSON.stringify({ type: 'css', value: 'nav{display:flex;}' }),
        JSON.stringify({ type: 'done' }),
      ].join('\n')

      await route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson',
        body,
      })
    })

    await page.goto('/builder')
    await page.getByTestId('chat-input').fill('Add a navbar')
    await expect(page.getByTestId('chat-send-button')).toBeEnabled()
    await page.getByTestId('chat-send-button').click()

    await expect(page.getByTestId('chat-message-user')).toBeVisible()
    await expect(page.getByTestId('chat-message-user')).toContainText('Add a navbar')

    await expect(page.getByTestId('chat-message-assistant')).toBeVisible({ timeout: 10_000 })
  })
})
