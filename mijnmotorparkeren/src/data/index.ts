import type { Gemeente, ParkingStatusValue } from '../types/gemeente'
import type { City } from '../types/city'

// Use PUBLIC_DATA_VERSION from .env for cache busting, fallback to today's date if empty
let DATA_VERSION = import.meta.env.PUBLIC_DATA_VERSION
if (!DATA_VERSION || DATA_VERSION.trim() === '') {
  const today = new Date()
  DATA_VERSION = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')
}

// Helper to generate versioned URLs for gemeente/city JSON files
export function getVersionedJsonUrl(type: 'gemeentes' | 'city', id: string) {
  return `/data/${type}/${id}.json?v=${DATA_VERSION}`
}

export function getIndexUrl() {
  return `/data/index.json?v=${DATA_VERSION}`
}

/** Lite gemeente shape returned from the index — sufficient for map rendering. */
export interface GemeenteLite extends Pick<Gemeente, 'id' | 'name' | 'province' | 'coordinates' | 'zoom' | 'statcode' | 'parkingStatus'> {
  parkingStatus: ParkingStatusValue
}

/** Singleton promise — all callers share the same in-flight request and cached result. */
let indexPromise: Promise<GemeenteLite[]> | null = null

/** Fetch the lightweight gemeente index. */
export function fetchGemeenteIndex(): Promise<GemeenteLite[]> {
  if (!indexPromise) {
    indexPromise = fetch(getIndexUrl())
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch gemeente index: ${res.status}`)
        return res.json()
      })
      .then(json => (json.gemeentes ?? []) as GemeenteLite[])
      .catch(err => { indexPromise = null; throw err })
  }
  return indexPromise
}

/** Fetch the full gemeente data for a single gemeente (on demand). */
export async function fetchFullGemeente(id: string): Promise<Gemeente> {
  const res = await fetch(getVersionedJsonUrl('gemeentes', id))
  if (!res.ok) throw new Error(`Gemeente not found: ${id} (${res.status})`)
  return res.json()
}

/** Fetch the full city data for a single city (on demand). */
export async function fetchFullCity(id: string): Promise<City> {
  const res = await fetch(getVersionedJsonUrl('city', id))
  if (!res.ok) throw new Error(`City not found: ${id} (${res.status})`)
  return res.json()
}
