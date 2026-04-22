import type { Gemeente, ParkingStatusValue } from '../types/gemeente'
import type { City, CityIndex } from '../types/city'
import type { POI, POIIndex } from '../types/poi'

let DATA_VERSION = import.meta.env.PUBLIC_DATA_VERSION
if (!DATA_VERSION || DATA_VERSION.trim() === '') {
  const today = new Date()
  DATA_VERSION =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')
}

export function getVersionedJsonUrl(type: 'gemeentes' | 'city' | 'poi', id: string) {
  return `/data/${type}/${id}.json?v=${DATA_VERSION}`
}

export function getIndexUrl() {
  return `/data/index.json?v=${DATA_VERSION}`
}

/** Lite gemeente shape returned from the index — sufficient for map rendering. */
export interface GemeenteLite extends Pick<
  Gemeente,
  'id' | 'name' | 'province' | 'coordinates' | 'zoom' | 'statcode' | 'parkingStatus'
> {
  parkingStatus: ParkingStatusValue
}

/** Singleton promise — all callers share the same in-flight request and cached result. */
let indexPromise: Promise<GemeenteLite[]> | null = null

/** Fetch the lightweight gemeente index. */
export function fetchGemeenteIndex(): Promise<GemeenteLite[]> {
  if (!indexPromise) {
    indexPromise = fetch(getIndexUrl())
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch gemeente index: ${res.status}`)
        return res.json()
      })
      .then((json) => (json.gemeentes ?? []) as GemeenteLite[])
      .catch((err) => {
        indexPromise = null
        throw err
      })
  }
  return indexPromise
}

/** Fetch the full gemeente data for a single gemeente (on demand). */
export async function fetchFullGemeente(id: string): Promise<Gemeente> {
  const res = await fetch(getVersionedJsonUrl('gemeentes', id))
  if (!res.ok) return { ...GEMEENTE_STUB, id } as Gemeente
  return res.json()
}

/** Stub returned when city file is not found — clearly identifiable but won't break the flow. */
export const CITY_STUB: City = {
  id: 'stub',
  parent: '',
  name: 'Stad niet gevonden',
  province: '',
  coordinates: { lat: 0, lng: 0 },
  parkingRules: {
    free: false,
    paid: { enabled: false, areas: [], rates: null },
    permits: { required: false, types: [] },
    restrictions: { timeLimit: null, noParking: [] },
    motorcycleSpecific: {
      dedicatedSpots: [],
      allowedOnSidewalk: false,
      freeInPaidZones: false,
      notes: '',
    },
  },
  area: { type: 'FeatureCollection', features: [] },
  lastUpdated: '',
  sources: [],
}

export const GEMEENTE_STUB: Gemeente = {
  id: 'stub',
  name: 'Gemeente niet gevonden',
  province: '',
  coordinates: { lat: 0, lng: 0 },
}

/** Fetch the full city data for a single city (on demand). */
export async function fetchFullCity(id: string): Promise<City> {
  const res = await fetch(getVersionedJsonUrl('city', id))
  if (!res.ok) return { ...CITY_STUB, id } as City
  return res.json()
}

let poiIndexPromise: Promise<POIIndex> | null = null
const loadedPOIs = new Map<string, POI[]>()

export function fetchPOIIndex(): Promise<POIIndex> {
  if (!poiIndexPromise) {
    poiIndexPromise = fetch(getVersionedJsonUrl('poi', 'index'))
      .then((res) => {
        if (!res.ok) return { pois: [], lastUpdated: '', version: '', lastGenerated: '', total: 0 } as POIIndex
        return res.json()
      })
      .catch(() => {
        poiIndexPromise = null
        return { pois: [], lastUpdated: '', version: '', lastGenerated: '', total: 0 } as POIIndex
      })
  }
  return poiIndexPromise
}

let cityIndexPromise: Promise<CityIndex | null> | null = null

function fetchCityIndex(): Promise<CityIndex | null> {
  if (!cityIndexPromise) {
    cityIndexPromise = fetch(getVersionedJsonUrl('city', 'index'))
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
  }
  return cityIndexPromise
}

export async function getCitiesForGemeente(gemeenteId: string): Promise<City[]> {
  const index = await fetchCityIndex()
  if (!index) return []
  const matching = index.cities.filter((c) => c.parent === gemeenteId)
  return Promise.all(matching.map((c) => fetchFullCity(c.id)))
}

export async function fetchMunicipalityPOIs(municipalityId: string): Promise<POI[]> {
  if (loadedPOIs.has(municipalityId)) {
    return loadedPOIs.get(municipalityId)!
  }

  const index = await fetchPOIIndex()
  const hasPOIs = index.pois.some((p) => p.municipalityId === municipalityId)
  if (!hasPOIs) {
    loadedPOIs.set(municipalityId, [])
    return []
  }

  const res = await fetch(getVersionedJsonUrl('poi', municipalityId))
  if (!res.ok) {
    loadedPOIs.set(municipalityId, [])
    return []
  }
  const data = await res.json()
  const pois = data.pois || []
  loadedPOIs.set(municipalityId, pois)
  return pois
}
