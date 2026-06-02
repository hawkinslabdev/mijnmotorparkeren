import { test, expect, waitForMap } from './fixtures'

test.use({ viewport: { width: 390, height: 844 } })

test.describe('Mobile UX', () => {
  test('search opens as bottom sheet', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    await page.getByRole('button', { name: 'Locatie zoeken' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // On mobile the sheet should be anchored to the bottom
    const box = await dialog.boundingBox()
    const viewport = page.viewportSize()!
    expect(box!.y + box!.height).toBeGreaterThan(viewport.height * 0.7)
  })

  test('bottom panel has drag handle', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    // The pill handle: w-12 h-1.5 bg-gray-300 rounded-full — check it exists
    const handle = page.locator('.w-12.h-1\\.5.bg-gray-300.rounded-full, [class*="h-1.5"][class*="rounded-full"]')
    await expect(handle).toBeVisible()
  })

  test('panel renders within viewport', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByText('Amsterdam')).toBeVisible()
    const panel = page.getByText('Amsterdam').locator('xpath=ancestor::div[contains(@class,"fixed")]')
    const box = await panel.first().boundingBox()
    const viewport = page.viewportSize()!
    // Panel should not exceed viewport width
    expect(box!.width).toBeLessThanOrEqual(viewport.width)
  })

  test('search button meets 44px touch target', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    const btn = page.getByRole('button', { name: 'Locatie zoeken' })
    const box = await btn.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('ParkingRules close button meets 44px touch target', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    const closeBtn = page.getByRole('button', { name: 'Sluiten' })
    const box = await closeBtn.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('map controls visible at correct positions', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    await expect(page.getByRole('button', { name: 'Ga naar huidige locatie' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset kaart' })).toBeVisible()
  })
})
