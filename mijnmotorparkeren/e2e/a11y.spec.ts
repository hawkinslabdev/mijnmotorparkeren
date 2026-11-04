import { test, expect, waitForMap } from './fixtures'

const search = async (page: import('@playwright/test').Page, query: string) => {
  await page.getByRole('button', { name: 'Locatie zoeken' }).click()
  await page.getByRole('combobox').fill(query)
}

test.describe('Accessibility', () => {
  test('search exposes combobox and listbox', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    await search(page, 'Amsterdam')
    const combobox = page.getByRole('combobox')
    await expect(page.getByRole('listbox')).toBeVisible()
    await expect(combobox).toHaveAttribute('aria-activedescendant', 'search-option-0')
    await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('status').filter({ hasText: /resultaat|resultaten/ })).toBeAttached()
  })

  test('selecting a result moves focus to the panel', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    await search(page, 'Amsterdam')
    await page.getByRole('option').first().click()
    await expect(page.getByRole('region', { name: /Parkeerregels: .*Amsterdam/ })).toBeFocused()
  })

  test('closing the panel restores focus', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await page.getByRole('button', { name: 'Sluiten' }).click()
    await expect(page.getByRole('button', { name: 'Locatie zoeken' })).toBeFocused()
  })

  test('cities are searchable', async ({ page }) => {
    const city = {
      id: 'schiphol',
      name: 'Schiphol',
      parent: 'haarlemmermeer',
      province: 'Noord-Holland',
      coordinates: { lat: 52.31, lng: 4.76 },
    }
    await page.route(/\/data\/city\/index\.json/, (r) => r.fulfill({ json: { cities: [city] } }))
    await page.route(/\/data\/city\/schiphol\.json/, (r) =>
      r.fulfill({
        json: { ...city, area: { type: 'FeatureCollection', features: [] }, lastUpdated: '', sources: [] },
      })
    )
    await page.goto('/')
    await waitForMap(page)
    await search(page, 'Schiphol')
    await expect(page.getByRole('option', { name: /Schiphol/ })).toBeVisible()
    await page.getByRole('combobox').press('Enter')
    await expect(page).toHaveURL(/\/stad\/schiphol/)
    await expect(page.getByRole('region', { name: 'Parkeerregels: Schiphol' })).toBeFocused()
  })

  test('POIs are reachable from the panel', async ({ page }) => {
    await page.route(/\/data\/poi\/index\.json/, (r) =>
      r.fulfill({ json: { pois: [{ municipalityId: 'amsterdam' }] } })
    )
    await page.route(/\/data\/poi\/amsterdam\.json/, (r) =>
      r.fulfill({
        json: {
          pois: [
            {
              id: 'stalling',
              type: 'dedicatedMotorcycleSpot',
              name: 'Motorstalling Centrum',
              coordinates: { lat: 52.37, lng: 4.89 },
              municipalityId: 'amsterdam',
            },
          ],
        },
      })
    )
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await page.getByRole('button', { name: /Motorstalling Centrum/ }).click()
    await expect(page.getByRole('heading', { name: 'Motorstalling Centrum' })).toBeVisible()
  })

  test('POI source link is not clipped', async ({ page }) => {
    await page.route(/\/data\/poi\/index\.json/, (r) =>
      r.fulfill({ json: { pois: [{ municipalityId: 'amsterdam' }] } })
    )
    await page.route(/\/data\/poi\/amsterdam\.json/, (r) =>
      r.fulfill({
        json: {
          pois: [
            {
              id: 'stalling',
              type: 'dedicatedMotorcycleSpot',
              name: 'Motorstalling Centrum',
              coordinates: { lat: 52.37, lng: 4.89 },
              municipalityId: 'amsterdam',
              source: { type: 'community', url: 'https://example.com', date: '2026-07-14' },
            },
          ],
        },
      })
    )
    await page.goto('/gemeente/amsterdam?poi=stalling')
    await waitForMap(page)
    const link = page.getByRole('link', { name: 'Community bijdrage' })
    await expect(link).toBeVisible()
    const panel = await page.getByRole('region', { name: /Parkeerregels:/ }).boundingBox()
    const linkBox = await link.boundingBox()
    expect(linkBox!.x).toBeGreaterThanOrEqual(panel!.x)
    expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(panel!.x + panel!.width)
  })

  test('legend lists only POI types in the area', async ({ page }) => {
    await page.route(/\/data\/poi\/index\.json/, (r) =>
      r.fulfill({ json: { pois: [{ municipalityId: 'amsterdam' }] } })
    )
    await page.route(/\/data\/poi\/amsterdam\.json/, (r) =>
      r.fulfill({
        json: {
          pois: [
            {
              id: 'stalling',
              type: 'dedicatedMotorcycleSpot',
              name: 'Motorstalling Centrum',
              coordinates: { lat: 52.37, lng: 4.89 },
              municipalityId: 'amsterdam',
            },
          ],
        },
      })
    )
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    const legend = page.getByRole('region', { name: 'Legenda' })
    await expect(legend.getByText('Motorstalplaats')).toHaveCount(1)
    await expect(legend.getByText('Gratis straatparkeren')).toHaveCount(0)
  })

  test('legend hides POI section without POIs', async ({ page }) => {
    await page.route(/\/data\/poi\/index\.json/, (r) => r.fulfill({ json: { pois: [] } }))
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByRole('heading', { name: 'Gemeente Amsterdam', exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Legenda' }).getByText('Parkeerlocaties')).toHaveCount(0)
  })

  test('spot without a count shows no placeholder', async ({ page }) => {
    await page.route(/\/data\/gemeentes\/amsterdam\.json/, (r) =>
      r.fulfill({
        json: {
          id: 'amsterdam',
          name: 'Gemeente Amsterdam',
          province: 'Noord-Holland',
          coordinates: { lat: 52.37, lng: 4.89 },
          parkingRules: {
            motorcycleSpecific: { dedicatedSpots: [{ location: 'Garage' }], notes: 'Test' },
          },
        },
      })
    )
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByText('Garage')).toBeVisible()
    await expect(page.getByText('undefined')).toHaveCount(0)
  })

  test('closing keeps the view; reset zooms out', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    const shape = page.locator('path.leaflet-interactive').first()
    await expect(shape).toBeAttached()
    await page.waitForTimeout(800)
    const before = await shape.getAttribute('d')

    await page.getByRole('button', { name: 'Sluiten' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.waitForTimeout(800)
    expect(await shape.getAttribute('d')).toBe(before)

    await page.getByRole('button', { name: 'Reset kaart' }).click()
    await expect.poll(() => shape.getAttribute('d')).not.toBe(before)
  })

  test('report link sits below the rules', async ({ page }) => {
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    const report = page.getByRole('link', { name: 'Probleem melden' })
    const box = await report.boundingBox()
    const close = await page.getByRole('button', { name: 'Sluiten' }).boundingBox()
    expect(box!.y).toBeGreaterThan(close!.y + close!.height)
    expect(box!.x).toBe(close!.x)
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('selecting another area closes the open POI', async ({ page }) => {
    await page.route(/\/data\/poi\/index\.json/, (r) =>
      r.fulfill({ json: { pois: [{ municipalityId: 'amsterdam' }] } })
    )
    await page.route(/\/data\/poi\/amsterdam\.json/, (r) =>
      r.fulfill({
        json: {
          pois: [
            {
              id: 'stalling',
              type: 'dedicatedMotorcycleSpot',
              name: 'Motorstalling Centrum',
              coordinates: { lat: 52.37, lng: 4.89 },
              municipalityId: 'amsterdam',
            },
          ],
        },
      })
    )
    await page.goto('/gemeente/amsterdam?poi=stalling')
    await waitForMap(page)
    await expect(page.getByRole('heading', { name: 'Motorstalling Centrum' })).toBeVisible()
    await page.getByRole('button', { name: 'Locatie zoeken' }).click()
    await page.getByRole('combobox').fill('Rotterdam')
    await expect(page.getByRole('option').first()).toBeVisible()
    await page.getByRole('combobox').press('Enter')
    await expect(page.getByRole('heading', { name: 'Motorstalling Centrum' })).toHaveCount(0)
    await expect(page).not.toHaveURL(/poi=/)
  })

  test('long source is cut with a tooltip on demand', async ({ page, hasTouch }) => {
    const name = 'Gemeente West Betuwe (Klantcontactcentrum) en nog een hele lange afdeling'
    await page.route(/\/data\/gemeentes\/amsterdam\.json/, (r) =>
      r.fulfill({
        json: {
          id: 'amsterdam',
          name: 'Gemeente Amsterdam',
          province: 'Noord-Holland',
          coordinates: { lat: 52.37, lng: 4.89 },
          parkingRules: { motorcycleSpecific: { allowedOnSidewalk: true, notes: 'Test' } },
          sources: [{ type: 'official', name }],
        },
      })
    )
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    const button = page.getByRole('button', { name: `Bron: ${name}` })
    const cut = await button.locator('span').evaluate((el) => el.scrollWidth > el.clientWidth)
    expect(cut).toBe(true)
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    const bubble = page.locator('.bg-gray-900', { hasText: name })
    await expect(bubble).toHaveCount(0)
    if (hasTouch) {
      await button.tap()
      await expect(bubble).toBeVisible()
      await page.locator('h2').first().tap()
    } else {
      await button.hover()
      await expect(bubble).toBeVisible()
      await button.click()
      await expect(bubble).toBeVisible()
      await page.mouse.move(0, 0)
    }
    await expect(bubble).toHaveCount(0)
  })

  test('paid parking shows without rates', async ({ page }) => {
    await page.route(/\/data\/gemeentes\/amsterdam\.json/, (r) =>
      r.fulfill({
        json: {
          id: 'amsterdam',
          name: 'Gemeente Amsterdam',
          province: 'Noord-Holland',
          coordinates: { lat: 52.37, lng: 4.89 },
          parkingRules: {
            paid: { enabled: true, areas: ['Centrum'] },
            motorcycleSpecific: { allowedOnSidewalk: false, notes: 'Test' },
          },
        },
      })
    )
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByText('Betaald parkeren')).toBeVisible()
    await expect(page.getByText('Centrum')).toBeVisible()
    await expect(page.getByText('Per uur:')).toHaveCount(0)
  })

  test('places within a gemeente find that gemeente', async ({ page }) => {
    await page.route(/\/data\/index\.json/, (r) =>
      r.fulfill({
        json: {
          gemeentes: [
            {
              id: 'amsterdam',
              name: 'Gemeente Amsterdam',
              province: 'Noord-Holland',
              alternativeNames: ['Testplaats'],
              coordinates: { lat: 52.37, lng: 4.89 },
              parkingStatus: 'sidewalk_allowed',
            },
          ],
        },
      })
    )
    await page.goto('/')
    await waitForMap(page)
    await search(page, 'Testplaats')
    await expect(page.getByRole('option', { name: /Gemeente Amsterdam.*ook Testplaats/ })).toBeVisible()
    await page.getByRole('combobox').press('Enter')
    await expect(page).toHaveURL(/\/gemeente\/amsterdam/)
    await expect(page.getByText('Geldt ook voor Testplaats')).toBeVisible()
  })

  test('share button confirms the result, then resets', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { value: () => false })
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve() },
      })
    })
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    const panel = page.getByRole('region', { name: /Parkeerregels:/ })
    await panel.getByRole('button', { name: 'Deel deze locatie' }).click()
    const done = panel.locator('[data-share-state="done"]')
    await expect(done).toHaveText('Link gekopieerd')
    await expect(page.getByRole('status').filter({ hasText: 'Link gekopieerd' })).toBeAttached()
    await expect(panel.getByRole('button', { name: 'Deel deze locatie' })).toBeVisible({
      timeout: 4000,
    })
  })

  test('closing the share sheet stays quiet', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { value: () => true })
      Object.defineProperty(navigator, 'share', {
        value: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
      })
    })
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    const panel = page.getByRole('region', { name: /Parkeerregels:/ })
    await panel.getByRole('button', { name: 'Deel deze locatie' }).click()
    await expect(panel.locator('[data-share-state="idle"]')).toBeVisible()
    await expect(page.getByText('Delen is niet gelukt')).toHaveCount(0)
  })

  test('failed index load tells the rider', async ({ page }) => {
    await page.route(/\/data\/index\.json/, (r) => r.abort())
    await page.goto('/')
    await waitForMap(page)
    await expect(page.getByText(/Kan parkeerregels niet laden/).first()).toBeVisible()
  })

  test('offline shows the notice', async ({ page, context }) => {
    await page.goto('/')
    await waitForMap(page)
    await context.setOffline(true)
    await expect(page.getByText(/Gelezen regels zijn mogelijk verouderd/).first()).toBeVisible()
    await context.setOffline(false)
  })

  test('denied location shows a message', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (_ok, fail) =>
        fail?.({ code: 1 } as GeolocationPositionError)
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForMap(page)
    await page.getByRole('button', { name: 'Ga naar huidige locatie' }).click()
    await expect(page.getByText(/Geen toegang tot je locatie/).first()).toBeVisible()
  })

  test('legend names missing information', async ({ page }) => {
    await page.goto('/')
    await waitForMap(page)
    await expect(page.getByRole('region', { name: 'Legenda' }).getByText('Geen informatie')).toBeVisible()
  })
})

test.describe('Alias URLs', () => {
  for (const [from, to] of [
    ['/gemeente/s-gravenhage', '/gemeente/den-haag'],
    ['/gemeente/ypenburg', '/gemeente/den-haag'],
    ['/gemeente/edam', '/gemeente/edam-volendam'],
    ['/stad/hoofddorp', '/gemeente/hoofddorp'],
    ['/stad/ijmuiden', '/gemeente/velsen'],
  ]) {
    test(`${from} redirects from the data`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 })
      expect(res.status()).toBe(301)
      expect(res.headers().location).toBe(to)
    })
  }

  test('place in a gemeente with rules gets its own page', async ({ request }) => {
    const res = await request.get('/gemeente/hoofddorp', { maxRedirects: 0 })
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain('Motor parkeren in Hoofddorp')
    expect(html).toContain('href="https://mijnmotorparkeren.nl/gemeente/hoofddorp"')
    expect(html).not.toContain('noindex')
    expect(html).toContain('valt onder')
  })

  test('place page says it also applies, until you move on', async ({ page }) => {
    const haarlemmermeer = {
      id: 'haarlemmermeer',
      name: 'Gemeente Haarlemmermeer',
      province: 'Noord-Holland',
      coordinates: { lat: 52.3, lng: 4.69 },
    }
    await page.route(/\/data\/index\.json/, (r) =>
      r.fulfill({ json: { gemeentes: [{ ...haarlemmermeer, parkingStatus: 'no_info' }] } })
    )
    await page.route(/\/data\/gemeentes\/haarlemmermeer\.json/, (r) =>
      r.fulfill({
        json: {
          ...haarlemmermeer,
          parkingRules: { motorcycleSpecific: { allowedOnSidewalk: true, notes: 'Test' } },
        },
      })
    )
    await page.goto('/gemeente/hoofddorp')
    await waitForMap(page)
    const line = page.getByText('Geldt ook voor Hoofddorp')
    await expect(page.getByRole('heading', { name: 'Gemeente Haarlemmermeer', exact: true })).toBeVisible()
    await expect(line).toBeVisible()

    await page.getByRole('button', { name: 'Sluiten' }).click()
    await expect(line).toHaveCount(0)
    await page.getByRole('button', { name: 'Locatie zoeken' }).click()
    await page.getByRole('combobox').fill('Haarlemmermeer')
    await expect(page.getByRole('option').first()).toBeVisible()
    await page.getByRole('combobox').press('Enter')
    await expect(page.getByRole('heading', { name: 'Gemeente Haarlemmermeer', exact: true })).toBeVisible()
    await expect(line).toHaveCount(0)
  })

  for (const url of ['/gemeente/den-haag', '/gemeente/de-ronde-venen', '/gemeente/hoofddorp', '/gemeente/aalten']) {
    test(`${url} never says gemeente twice`, async ({ page }) => {
      await page.goto(url)
      const text = await page.locator('article').innerText()
      expect(text).toMatch(/motor parkeren/i)
      expect(text).not.toMatch(/gemeente\s+gemeente/i)
    })
  }

  test('unknown slug does not redirect', async ({ request }) => {
    const res = await request.get('/gemeente/bestaat-niet', { maxRedirects: 0 })
    expect(res.status()).not.toBe(301)
  })
})

test.describe('Mobile layouts', () => {
  test('search sheet matches the panel and swipes closed', async ({ page, hasTouch }) => {
    test.skip(!hasTouch, 'needs touch')
    await page.goto('/')
    await waitForMap(page)
    await page.getByRole('button', { name: 'Locatie zoeken' }).click()
    await expect(page.getByRole('heading', { name: 'Gemeente of stad zoeken' })).toBeVisible()
    await expect(page.getByRole('combobox')).toBeFocused()

    const cdp = await page.context().newCDPSession(page)
    const box = (await page.getByRole('heading', { name: 'Gemeente of stad zoeken' }).boundingBox())!
    const point = (y: number) => [{ x: box.x + 10, y }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(box.y) })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(box.y + 60) })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(box.y + 140) })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('legend collapses after first map touch and stays collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForMap(page)
    const entry = page.getByText('Geen informatie')
    const toggle = page.getByRole('button', { name: 'Legenda' })
    await expect(entry).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await page.locator('.leaflet-container').click({ position: { x: 40, y: 40 } })
    await expect(entry).toBeHidden()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    const box = await toggle.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)

    await page.reload()
    await waitForMap(page)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  test('reopened legend stays open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForMap(page)
    const toggle = page.getByRole('button', { name: 'Legenda' })
    await page.locator('.leaflet-container').click({ position: { x: 40, y: 40 } })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(page.getByText('Geen informatie')).toBeVisible()
    await page.locator('.leaflet-container').click({ position: { x: 40, y: 40 } })
    await page.reload()
    await waitForMap(page)
    await expect(page.getByText('Geen informatie')).toBeVisible()
  })

  test('desktop legend stays open', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await waitForMap(page)
    await page.locator('.leaflet-container').click({ position: { x: 40, y: 40 } })
    await expect(page.getByText('Geen informatie')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Legenda' })).toHaveCount(0)
  })

  test('desktop panel fits its content', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.route(/\/data\/poi\/index\.json/, (r) => r.fulfill({ json: { pois: [] } }))
    await page.route(/\/data\/gemeentes\/amsterdam\.json/, (r) =>
      r.fulfill({
        json: {
          id: 'amsterdam',
          name: 'Gemeente Amsterdam',
          province: 'Noord-Holland',
          coordinates: { lat: 52.37, lng: 4.89 },
          parkingRules: { motorcycleSpecific: { allowedOnSidewalk: true, notes: 'Test' } },
          sources: [{ type: 'official', name: 'Afdeling Handhaving' }],
        },
      })
    )
    await page.goto('/gemeente/amsterdam')
    await waitForMap(page)
    await expect(page.getByText('Bron: Afdeling Handhaving')).toBeVisible()
    await expect(page.getByText('Nog niet bijgewerkt')).toHaveCount(0)
    const panel = (await page.getByRole('region', { name: /Parkeerregels:/ }).boundingBox())!
    const main = (await page.locator('main').boundingBox())!
    expect(panel.height).toBeLessThan(main.height - 100)
    expect(panel.width).toBe(384)
  })

  test('share stays at one spot across areas', async ({ page }) => {
    const shareY = async (notes: string) => {
      await page.route(/\/data\/gemeentes\/amsterdam\.json/, (r) =>
        r.fulfill({
          json: {
            id: 'amsterdam',
            name: 'Gemeente Amsterdam',
            province: 'Noord-Holland',
            coordinates: { lat: 52.37, lng: 4.89 },
            parkingRules: { motorcycleSpecific: { allowedOnSidewalk: true, notes } },
          },
        })
      )
      await page.goto('/gemeente/amsterdam')
      await waitForMap(page)
      const share = page.getByRole('button', { name: 'Deel deze locatie' })
      await expect(share).toBeInViewport({ ratio: 1 })
      // Let the slide-up finish
      await page.waitForTimeout(400)
      const box = (await share.boundingBox())!
      const panel = (await page.getByRole('region', { name: /Parkeerregels:/ }).boundingBox())!
      // Nothing may show below share
      expect(panel.y + panel.height - (box.y + box.height)).toBeCloseTo(16, 0)
      return box.y
    }
    const short = await shareY('Kort.')
    const long = await shareY('Lange tekst over parkeren. '.repeat(120))
    expect(long).toBe(short)
  })

  test('landscape phone keeps map controls', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1',
      baseURL: 'http://localhost:4321',
      serviceWorkers: 'block',
    })
    const page = await context.newPage()
    await page.route(/tile\.openstreetmap\.org/, (r) => r.abort())
    await page.goto('/')
    await waitForMap(page)
    await expect(page.getByRole('button', { name: 'Ga naar huidige locatie' })).toBeVisible()
    await context.close()
  })

  test('primary controls meet 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForMap(page)
    for (const control of [
      page.getByRole('button', { name: 'Locatie zoeken' }),
      page.getByRole('button', { name: 'Sluit melding' }),
      page.getByRole('link', { name: 'Melden' }),
      page.getByRole('link', { name: 'Ga naar de hoofdpagina' }),
    ]) {
      const box = await control.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }
  })

  test('doubled text keeps header controls on screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForMap(page)
    await page.addStyleTag({ content: 'html{font-size:200%}' })
    const box = await page.getByRole('button', { name: 'Open menu' }).boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    const title = await page.getByText('MijnMotorParkeren.nl').boundingBox()
    expect(title!.width).toBeGreaterThan(150)
  })
})
