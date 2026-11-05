import type { Locator, Page } from '@playwright/test'
import { test, expect, waitForMap } from './fixtures'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

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
    await expect(page.getByRole('heading', { name: 'Gemeente Amsterdam', exact: true })).toBeVisible()
    const panel = page.getByRole('region', { name: /Parkeerregels/ })
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

test.describe('Mobile POI sheet', () => {
  const poi = {
    id: 'stalling',
    type: 'dedicatedMotorcycleSpot',
    name: 'Motorstalling Centrum',
    description: 'Overdekt en gratis.',
    coordinates: { lat: 52.37, lng: 4.89 },
    municipalityId: 'amsterdam',
  }

  test.beforeEach(async ({ page }) => {
    await page.route(/\/data\/poi\/index\.json/, (r) =>
      r.fulfill({ json: { pois: [{ municipalityId: 'amsterdam' }] } })
    )
    await page.route(/\/data\/poi\/amsterdam\.json/, (r) => r.fulfill({ json: { pois: [poi] } }))
  })

  const expectMarkerCentredAboveSheet = async (page: Page) => {
    const sheet = page.getByRole('region', { name: /Parkeerregels/ })
    const marker = page.locator('.leaflet-poi-markers-pane path')
    await expect
      .poll(async () => {
        const [m, s, map] = await Promise.all([
          marker.boundingBox(),
          sheet.boundingBox(),
          page.locator('.leaflet-container').boundingBox(),
        ])
        if (!m || !s || !map) return false
        // Centred in the visible map
        return Math.abs(m.y + m.height / 2 - (map.y + s.y) / 2) < 3
      })
      .toBe(true)
  }

  // Raw tap: click() scrolls around the dev toolbar
  const tapHandle = async (page: Page, handle: Locator) => {
    const box = (await handle.boundingBox())!
    await page.touchscreen.tap(box.x + box.width / 2, box.y + 8)
  }

  test('shared link shows POI above sheet, handle peeks and expands', async ({ page }) => {
    await page.goto('/gemeente/amsterdam?poi=stalling')
    await waitForMap(page)
    await expect(page.getByRole('heading', { name: poi.name })).toBeVisible()
    await expectMarkerCentredAboveSheet(page)

    const handle = page.getByRole('button', { name: `Details van ${poi.name}` })
    await tapHandle(page, handle)
    await expect(handle).toHaveAttribute('aria-expanded', 'false')
    await expect(handle).toContainText(poi.name)
    await expect(page.getByText(poi.description)).toBeHidden()
    await expect(page.getByRole('button', { name: /Terug naar/ })).toBeHidden()
    await expectMarkerCentredAboveSheet(page)

    await tapHandle(page, handle)
    await expect(page.getByText(poi.description)).toBeVisible()
    await expectMarkerCentredAboveSheet(page)
  })

  test('swipe down peeks without leaving the POI', async ({ page, context }) => {
    await page.goto('/gemeente/amsterdam?poi=stalling')
    await waitForMap(page)
    const handle = page.getByRole('button', { name: `Details van ${poi.name}` })
    const box = (await handle.boundingBox())!
    const x = box.x + box.width / 2
    const cdp = await context.newCDPSession(page)
    const touch = (type: string, y?: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type: type as 'touchStart',
        touchPoints: y === undefined ? [] : [{ x, y }],
      })
    await touch('touchStart', box.y + 10)
    await touch('touchMove', box.y + 130)
    await touch('touchEnd')
    await expect(handle).toHaveAttribute('aria-expanded', 'false')
    await expect(page).toHaveURL(/poi=stalling/)
  })

  test('granted location shows marker on a gemeente link', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 52.36, longitude: 4.88 })
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.locator('path.leaflet-user-location-indicator')).toBeAttached()
  })
})
