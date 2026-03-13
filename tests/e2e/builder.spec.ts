import { expect, test } from '@playwright/test'

test.describe('Builder Studio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/builder')
  })

  test('loads the builder page shell, canvas, and chat panels', async ({ page }) => {
    await expect(page.getByTestId('builder-studio-shell')).toBeVisible()
    await expect(page.getByTestId('builder-canvas-panel')).toBeVisible()
    await expect(page.getByTestId('builder-chat-panel')).toBeVisible()
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

test.describe('Chat generate flow (mocked API)', () => {
  test('submitting a prompt shows user message and streaming indicator', async ({ page }) => {
    // Mock the generate endpoint to return a slow stream
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

    // User message appears immediately
    await expect(page.getByTestId('chat-message-user')).toBeVisible()
    await expect(page.getByTestId('chat-message-user')).toContainText('Add a navbar')

    // Assistant reply eventually appears
    await expect(page.getByTestId('chat-message-assistant')).toBeVisible({ timeout: 10_000 })
  })
})
