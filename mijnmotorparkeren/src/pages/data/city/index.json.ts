// src/pages/data/city/index.json.ts
// Dynamically generates the city index from the filesystem.
import type { APIRoute } from 'astro'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

let cache: string | null = null

async function buildCityIndex(): Promise<string> {
  const dir = path.join(process.cwd(), 'data', 'city')
  const files = (await readdir(dir)).filter(f => f.endsWith('.json') && f !== 'index.json')

  const cities: object[] = []
  const warnings: string[] = []

  await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(dir, file), 'utf-8')
      const d = JSON.parse(raw)
      const parent = d.parent ?? d.municipality
      if (!parent) {
        warnings.push(`${file}: missing 'parent' field — skipped`)
        return
      }
      cities.push({
        id: d.id ?? path.basename(file, '.json'),
        name: d.name,
        parent,
        province: d.province,
        coordinates: d.coordinates,
        reference: `city/${file}`,
        ...(d.postalCodes ? { postalCodes: d.postalCodes } : {}),
        ...(d.alternativeNames ? { alternativeNames: d.alternativeNames } : {}),
      })
    })
  )

  if (warnings.length > 0) console.warn('[city/index.json]', warnings.join('; '))

  const index = {
    lastUpdated: new Date().toISOString(),
    cities,
  }

  return JSON.stringify(index)
}

export const GET: APIRoute = async () => {
  if (!cache || import.meta.env.DEV) cache = await buildCityIndex()
  return new Response(cache, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': import.meta.env.DEV ? 'no-store' : 'public, max-age=3600',
    },
  })
}
