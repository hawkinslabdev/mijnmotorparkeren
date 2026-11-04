import type { Coordinates, ParkingRules, Source } from './gemeente'
import type { FeatureCollection } from 'geojson'

export interface City {
  id: string
  parent: string // gemeente id
  name: string
  province: string
  coordinates: Coordinates
  parkingRules: ParkingRules // Complete rules, overrides gemeente
  area: FeatureCollection // City boundary
  lastUpdated: string
  sources: Source[]

  // Additional metadata
  population?: number
  postalCodes?: string[]
  alternativeNames?: string[]
  overrideReason?: string
  effectiveDate?: string
}

/** City entry from the city index. */
export type CityLite = Pick<
  City,
  'id' | 'name' | 'parent' | 'province' | 'coordinates' | 'alternativeNames'
>

export interface ParkingRuleContext {
  location: Coordinates
  gemeente: string
  city?: string
  timestamp: string
  source: 'city' | 'gemeente'
  confidence: number
}

export interface CityLookupResult {
  city: City | null
  gemeente: string
  source: 'city' | 'gemeente'
  confidence: number
}
