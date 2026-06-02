import { test as base, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(import.meta.dirname, 'mocks')
const indexMock = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf-8'))
const amsterdamMock = JSON.parse(readFileSync(join(dir, 'amsterdam.json'), 'utf-8'))
const geojsonMock = JSON.parse(readFileSync(join(dir, 'gemeente-2026.geojson'), 'utf-8'))

/** Sets up route mocks before every test so no real network calls leave the machine. */
async function mockRoutes(page: Page) {
  // Regex patterns so ?v= cache-busting params are matched correctly
  await page.route(/\/data\/index\.json/, (r) => r.fulfill({ json: indexMock }))
  await page.route(/\/data\/gemeente_2026\.geojson/, (r) => r.fulfill({ json: geojsonMock }))
  await page.route(/\/data\/gemeentes\/amsterdam\.json/, (r) => r.fulfill({ json: amsterdamMock }))
  await page.route(/\/data\/city\/index\.json/, (r) => r.fulfill({ json: { version: '1.0', cities: [] } }))
  // Abort tile requests — we test UI, not cartography
  await page.route(/tile\.openstreetmap\.org/, (r) => r.abort())
}

/** Wait for the React island + Leaflet to be fully hydrated. */
export async function waitForMap(page: Page) {
  await page.waitForSelector('.leaflet-container', { state: 'attached' })
}

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await mockRoutes(page)
    await use(page)
  },
})

export { expect }
