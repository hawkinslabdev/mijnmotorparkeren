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
    await expect(page.getByRole('heading', { name: 'Gemeente Amsterdam', exact: true })).toBeVisible()
  })

  test('unknown route shows branded 404', async ({ page }) => {
    const response = await page.goto('/bestaat-niet')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Deze pagina staat niet op de kaart'
    )
    await page.getByRole('link', { name: 'Terug naar de kaart' }).click()
    await waitForMap(page)
  })

  for (const path of ['/gemeente/amsterdam', '/stad/abcoude']) {
    test(`${path} keeps the article below the fold before the app mounts`, async ({ page }) => {
      await page.route(/\/src\/App\.tsx/, async (r) => {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        await r.continue()
      })
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const article = page.locator('article')
      await expect(article).toBeAttached()
      const box = await article.boundingBox()
      expect(box!.y).toBeGreaterThanOrEqual(page.viewportSize()!.height)
    })

    test(`${path} hides the article and locks page scroll once mounted`, async ({ page }) => {
      await page.goto(path)
      await waitForMap(page)
      await expect(page.locator('article')).toBeAttached()
      await expect(page.locator('article')).toBeHidden()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollHeight - document.documentElement.clientHeight
      )
      expect(overflow).toBe(0)
    })
  }

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    for (const path of ['/gemeente/amsterdam', '/stad/abcoude']) {
      test(`${path} still shows the article`, async ({ page }) => {
        await page.goto(path)
        await expect(page.locator('article')).toBeVisible()
      })
    }
  })
})
