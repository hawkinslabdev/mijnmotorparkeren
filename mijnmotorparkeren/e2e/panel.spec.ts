import { test, expect, waitForMap } from './fixtures'

test.describe('Detail panel', () => {
  test('opens on /gemeente/amsterdam', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByText('Amsterdam')).toBeVisible()
  })

  test('shows parking rule: stoep toegestaan', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByText(/stoep.*toegestaan/i)).toBeVisible()
  })

  test('close button dismisses panel', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByText('Amsterdam')).toBeVisible()
    await page.getByRole('button', { name: 'Sluiten' }).click()
    await expect(page.getByText('Amsterdam')).not.toBeVisible()
  })

  test('share button visible in panel', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByRole('button', { name: /deel/i })).toBeVisible()
  })

  test('panel opens via search selection', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    await page.getByRole('button', { name: 'Locatie zoeken' }).click()
    await page.getByPlaceholder('Zoek gemeente...').fill('Amsterdam')
    await page.getByText('Amsterdam').first().click()
    await expect(page.getByText(/parkeren/i).first()).toBeVisible()
  })

  test('panel skeleton shown while loading', async ({ page }) => {
    // Slow down the gemeente JSON response to catch the loading state
    await page.route('/data/gemeentes/amsterdam.json', async (route) => {
      await new Promise((r) => setTimeout(r, 400))
      const { readFileSync } = await import('node:fs')
      const { join } = await import('node:path')
      const data = JSON.parse(readFileSync(join(import.meta.dirname, 'mocks/amsterdam.json'), 'utf-8'))
      await route.fulfill({ json: data })
    })
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    // Skeleton uses animate-pulse — check it appears before content
    await expect(page.locator('.animate-pulse')).toBeVisible()
    // Then content loads
    await expect(page.getByText('Amsterdam')).toBeVisible()
  })
})
