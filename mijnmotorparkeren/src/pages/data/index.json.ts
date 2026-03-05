/// <reference types="node" />
// src/pages/data/index.json.ts
// Dynamically generates the gemeente index from the filesystem.
// Module-level cache: built once per server process, never stale between deploys.
import type { APIRoute } from 'astro'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

let cache: string | null = null

interface RawParkingRules {
  free?: boolean | null
  paid?: { enabled?: boolean | null } | null
  motorcycleSpecific?: {
    allowedOnSidewalk?: boolean | null
    freeInPaidZones?: boolean | null
  } | null
}

function computeParkingStatus(rules: RawParkingRules | null | undefined): string {
  if (!rules) return 'no_info'
  const moto = rules.motorcycleSpecific
  if (!moto) return 'no_info'
  if ((rules.free === true || moto.freeInPaidZones === true) && moto.allowedOnSidewalk === true) return 'free_parking'
  if (moto.allowedOnSidewalk === true) return 'sidewalk_allowed'
  if (rules.paid?.enabled === true || rules.free === false) return 'paid_parking'
  return 'no_info'
}

async function buildIndex(): Promise<string> {
  const dir = path.join(process.cwd(), 'data', 'gemeentes')
  const files = (await readdir(dir)).filter(f => f.endsWith('.json'))

  const entries = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(dir, file), 'utf-8')
      const d = JSON.parse(raw)
      return {
        id: d.id,
        ...(d.type ? { type: d.type } : {}),
        name: d.name,
        province: d.province,
        coordinates: d.coordinates,
        ...(d.zoom != null ? { zoom: d.zoom } : {}),
        ...(d.statcode ? { statcode: d.statcode } : {}),
        parkingStatus: computeParkingStatus(d.parkingRules),
        reference: `gemeentes/${file}`,
      }
    })
  )

  // Deduplicate by id (last write wins)
  const seen = new Map<string, object>()
  for (const e of entries) seen.set(e.id, e)

  const index = {
    version: '1.0',
    lastGenerated: new Date().toISOString(),
    total: seen.size,
    gemeentes: [...seen.values()],
  }

  return JSON.stringify(index)
}

export const GET: APIRoute = async () => {
  if (!cache || import.meta.env.DEV) cache = await buildIndex()
  return new Response(cache, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': import.meta.env.DEV ? 'no-store' : 'public, max-age=3600',
    },
  })
}
