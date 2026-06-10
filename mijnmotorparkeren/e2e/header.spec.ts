import { test, expect, waitForMap } from './fixtures'

test.describe('Header', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
  })

  test('logo links to home', async ({ page }) => {
    const logo = page.getByRole('link', { name: 'Ga naar de hoofdpagina' })
    await expect(logo).toBeVisible()
    await expect(logo).toHaveAttribute('href', '/')
  })

  test('search button opens spotlight', async ({ page }) => {
    await page.getByRole('button', { name: 'Locatie zoeken' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByPlaceholder('Zoek gemeente...')).toBeFocused()
  })

  test('Cmd+K opens spotlight', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('spotlight closes on Escape', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('search shows results and allows selection', async ({ page }) => {
    await page.getByRole('button', { name: 'Locatie zoeken' }).click()
    await page.getByPlaceholder('Zoek gemeente...').fill('Amsterdam')
    await expect(page.getByText('Amsterdam').first()).toBeVisible()
    await page.getByText('Amsterdam').first().click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})

test.describe('Header — mobile menu', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
  })

  test('hamburger opens and closes menu', async ({ page }) => {
    const burger = page.getByRole('button', { name: 'Open menu' })
    await burger.click()
    await expect(page.locator('#mobile-menu')).toBeVisible()
    await page.getByRole('button', { name: 'Sluit menu' }).first().click()
    await expect(page.locator('#mobile-menu')).not.toBeVisible()
  })

  test('Escape closes mobile menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.locator('#mobile-menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('#mobile-menu')).not.toBeVisible()
  })

  test('hamburger meets 44px touch target', async ({ page }) => {
    const burger = page.getByRole('button', { name: 'Open menu' })
    const box = await burger.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })
})
