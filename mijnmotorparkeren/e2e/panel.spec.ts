import { test, expect, waitForMap } from './fixtures'

test.describe('Detail panel', () => {
  test('opens on /gemeente/amsterdam', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByRole('heading', { name: 'Gemeente Amsterdam' })).toBeVisible()
  })

  test('shows parking rule: stoep toegestaan', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByText(/stoep.*toegestaan/i).first()).toBeVisible()
  })

  test('close button dismisses panel', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByRole('heading', { name: 'Gemeente Amsterdam' })).toBeVisible()
    await page.getByRole('button', { name: 'Sluiten' }).click()
    await expect(page.getByRole('heading', { name: 'Gemeente Amsterdam' })).not.toBeVisible()
  })

  test('share button visible in panel', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByRole('button', { name: 'Deel deze locatie' })).toBeVisible()
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
    // Hold the gemeente JSON response until skeleton is confirmed
    let release: () => void
    const held = new Promise<void>((r) => { release = r })

    await page.route(/\/data\/gemeentes\/amsterdam\.json/, async (route) => {
      await held
      const { readFileSync } = await import('node:fs')
      const { join } = await import('node:path')
      const data = JSON.parse(readFileSync(join(import.meta.dirname, 'mocks/amsterdam.json'), 'utf-8'))
      await route.fulfill({ json: data })
    })
    await page.goto('/gemeente/amsterdam')
    // Skeleton in DOM while data loading — width:0 on desktop (auto-width container) so use count not visible
    await expect(page.locator('.animate-pulse')).toHaveCount(1, { timeout: 5000 })
    release!()
    // Then content loads after release
    await expect(page.getByRole('heading', { name: 'Gemeente Amsterdam' })).toBeVisible()
  })
})
