import type { Gemeente, ParkingStatusValue } from '../types/gemeente'
import type { City } from '../types/city'

// Use PUBLIC_DATA_VERSION from .env for cache busting, fallback to a default date if empty
let DATA_VERSION = import.meta.env.PUBLIC_DATA_VERSION
if (!DATA_VERSION || DATA_VERSION.trim() === '') {
  DATA_VERSION = '20250101'
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

/** Fetch the lightweight gemeente index. */
export async function fetchGemeenteIndex(): Promise<GemeenteLite[]> {
  const res = await fetch(getIndexUrl())
  if (!res.ok) throw new Error(`Failed to fetch gemeente index: ${res.status}`)
  const json = await res.json()
  return (json.gemeentes ?? []) as GemeenteLite[]
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
