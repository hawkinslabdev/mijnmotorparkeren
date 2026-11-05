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

  // Swipe release transitions the sheet
  const sheetSettled = (handle: Locator) =>
    handle.evaluate((el) =>
      Promise.all(
        el
          .closest('[role="region"]')!
          .getAnimations()
          .map((a) => a.finished)
      )
    )

  // Raw tap: click() scrolls around the dev toolbar
  const tapHandle = async (page: Page, handle: Locator) => {
    await sheetSettled(handle)
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

  test('POI close button dismisses the whole panel', async ({ page }) => {
    await page.goto('/gemeente/amsterdam?poi=stalling')
    await waitForMap(page)
    await expect(page.getByRole('button', { name: /Terug naar/ })).toBeVisible()
    const close = page.getByRole('button', { name: 'Sluiten' })
    const box = (await close.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
    await close.click()
    await expect(page.getByRole('region', { name: /Parkeerregels/ })).toHaveCount(0)
    await expect(page).toHaveURL(/\/$/)
  })

  test('swipe down peeks without leaving the POI', async ({ page, context }) => {
    await page.goto('/gemeente/amsterdam?poi=stalling')
    await waitForMap(page)
    const handle = page.getByRole('button', { name: `Details van ${poi.name}` })
    const box = (await handle.boundingBox())!
    // Dev toolbar covers the centre
    const x = box.x + 20
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

    await sheetSettled(handle)
    const peeked = (await handle.boundingBox())!
    await touch('touchStart', peeked.y + 10)
    await touch('touchMove', peeked.y + 50)
    await touch('touchEnd')
    await expect(page.getByRole('region', { name: /Parkeerregels/ })).toHaveCount(0)
    await expect(page).toHaveURL(/\/$/)
  })

  test('granted location shows marker on a gemeente link', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 52.36, longitude: 4.88 })
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    const dot = page.locator('.leaflet-user-location-pane path.leaflet-user-location-indicator')
    await expect(dot).toBeAttached()
    await expect(page.locator('.leaflet-user-location-pane')).toHaveCSS('z-index', '510')
  })

  test('Street View is a plain link and contacts nothing on load', async ({ page }) => {
    const googleRequests: string[] = []
    page.on('request', (r) => {
      if (new URL(r.url()).hostname.includes('google')) googleRequests.push(r.url())
    })
    await page.goto('/gemeente/amsterdam?poi=stalling')
    await waitForMap(page)
    const link = page.getByRole('link', { name: 'Bekijk in Street View' })
    await expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=52.37,4.89'
    )
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(googleRequests).toEqual([])
  })

  test('gemeente sheet collapses to show POIs, then closes', async ({ page, context }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    const handle = page.getByRole('button', { name: /Details van .*Amsterdam/ })
    await expect(handle).toHaveAttribute('aria-expanded', 'true')
    const cdp = await context.newCDPSession(page)
    const swipeDown = async (distance = 120) => {
      await sheetSettled(handle)
      const box = (await handle.boundingBox())!
      // Dev toolbar covers the centre
      const x = box.x + 20
      const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', y?: number) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: y === undefined ? [] : [{ x, y }],
        })
      await send('touchStart', box.y + 10)
      await send('touchMove', box.y + 10 + distance)
      await send('touchEnd')
    }

    await swipeDown()
    await expect(handle).toHaveAttribute('aria-expanded', 'false')
    await expect(handle).toContainText('Amsterdam')
    await expect(page.getByRole('button', { name: 'Sluiten' })).toBeHidden()
    await expect(page).toHaveURL(/gemeente\/amsterdam/)
    const sheet = (await page.getByRole('region', { name: /Parkeerregels/ }).boundingBox())!
    expect(sheet.height).toBeLessThan(100)
    const marker = (await page.locator('.leaflet-poi-markers-pane path').boundingBox())!
    expect(marker.y + marker.height).toBeLessThan(sheet.y)

    await tapHandle(page, handle)
    await expect(page.getByRole('button', { name: 'Sluiten' })).toBeVisible()

    await swipeDown()
    await expect(handle).toHaveAttribute('aria-expanded', 'false')
    await swipeDown(40)
    await expect(page.getByRole('region', { name: /Parkeerregels/ })).toHaveCount(0)
  })

  const swipe = async (page: Page, x: number, from: number, to: number) => {
    const cdp = await page.context().newCDPSession(page)
    const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', y?: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: y === undefined ? [] : [{ x, y }],
      })
    await send('touchStart', from)
    await send('touchMove', (from + to) / 2)
    await send('touchMove', to)
    await send('touchEnd')
  }

  const city = {
    id: 'centrum',
    name: 'Centrum',
    parent: 'amsterdam',
    coordinates: { lat: 52.37, lng: 4.89 },
    parkingRules: { motorcycleSpecific: { allowedOnSidewalk: true } },
    area: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [4.86, 52.35],
                [4.92, 52.35],
                [4.92, 52.39],
                [4.86, 52.39],
                [4.86, 52.35],
              ],
            ],
          },
        },
      ],
    },
  }

  for (const { url, title, shape } of [
    {
      url: '/gemeente/amsterdam',
      title: /Details van .*Amsterdam/,
      shape: 'path.leaflet-interactive',
    },
    {
      url: '/stad/centrum',
      title: /Details van .*Centrum/,
      shape: '.leaflet-city-boundaries-pane path',
    },
  ]) {
    test(`tapping ${url} while minimized reopens without moving the map`, async ({ page }) => {
      await page.route(/\/data\/city\/index\.json/, (r) =>
        r.fulfill({ json: { cities: [{ id: city.id, name: city.name, parent: city.parent }] } })
      )
      await page.route(/\/data\/city\/centrum\.json/, (r) => r.fulfill({ json: city }))
      await page.goto(url)
      await waitForMap(page)
      const handle = page.getByRole('button', { name: title })
      await sheetSettled(handle)
      const box = (await handle.boundingBox())!
      await swipe(page, box.x + 20, box.y + 10, box.y + 130)
      await expect(handle).toHaveAttribute('aria-expanded', 'false')

      // Pan so recentring would show
      const map = (await page.locator('.leaflet-container').boundingBox())!
      const cx = map.x + map.width / 2
      const cy = map.y + map.height / 2
      await swipe(page, cx, cy, cy - 40)
      await page.waitForTimeout(800)
      const area = page.locator(shape).first()
      const before = await area.boundingBox()
      const historyBefore = await page.evaluate(() => history.length)

      // Off-centre: POI markers sit mid-map
      await page.touchscreen.tap(cx + 80, cy - 60)
      await expect(handle).toHaveAttribute('aria-expanded', 'true')
      await page.waitForTimeout(800)
      expect(await area.boundingBox()).toEqual(before)
      expect(await page.evaluate(() => history.length)).toBe(historyBefore)
    })
  }

  test('selecting another area while minimized still switches', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    const handle = page.getByRole('button', { name: /Details van .*Amsterdam/ })
    await sheetSettled(handle)
    const box = (await handle.boundingBox())!
    await swipe(page, box.x + 20, box.y + 10, box.y + 130)
    await expect(handle).toHaveAttribute('aria-expanded', 'false')

    await page.getByRole('button', { name: 'Locatie zoeken' }).click()
    await page.getByRole('combobox').fill('Rotterdam')
    // Default list also shows Rotterdam
    await expect(page.getByRole('option')).toHaveCount(1)
    await page.getByRole('combobox').press('Enter')
    await expect(page).toHaveURL(/gemeente\/rotterdam/)
    await expect(page.getByRole('button', { name: /Details van .*Rotterdam/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
  })

  test.describe('side panel', () => {
    test.use({ viewport: { width: 700, height: 800 } })

    test('selected POI stays clear of the panel', async ({ page }) => {
      await page.goto('/gemeente/amsterdam?poi=stalling')
      await waitForMap(page)
      await expect(page.getByRole('heading', { name: poi.name })).toBeVisible()
      const panel = page.getByRole('region', { name: /Parkeerregels/ })
      const marker = page.locator('.leaflet-poi-markers-pane path')
      await expect
        .poll(async () => {
          const [m, p] = await Promise.all([marker.boundingBox(), panel.boundingBox()])
          return m && p ? m.x + m.width < p.x && m.x > 0 : false
        })
        .toBe(true)
    })
  })
})
