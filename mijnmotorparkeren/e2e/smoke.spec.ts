import { test, expect, waitForMap } from './fixtures'

test.describe('Smoke', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    await expect(page).toHaveTitle(/MijnMotorParkeren/i)
  })

  test('header visible', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    await expect(page.locator('header').first()).toBeVisible()
    await expect(page.getByText('MijnMotorParkeren.nl')).toBeVisible()
    await expect(page.getByText('Even snel je motor parkeren')).toBeVisible()
  })

  test('PromoBar visible and dismissable', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    const closeBtn = page.getByRole('button', { name: /sluit/i }).first()
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await expect(closeBtn).not.toBeVisible()
  })

  test('map container renders', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    await expect(page.locator('.leaflet-container')).toBeVisible()
  })

  test('/gemeente/amsterdam loads panel', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByRole('heading', { name: /amsterdam/i })).toBeVisible()
  })
})
