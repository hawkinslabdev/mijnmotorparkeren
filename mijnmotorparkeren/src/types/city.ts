// src/types/city.ts
import { Coordinates, ParkingRules, Source } from './gemeente'
import { FeatureCollection } from 'geojson'

export interface City {
  id: string
  parent: string  // gemeente id
  name: string
  province: string
  coordinates: Coordinates
  parkingRules: ParkingRules  // Complete rules, overrides gemeente
  area: FeatureCollection  // City boundary - now properly typed
  lastUpdated: string
  sources: Source[]
  
  // Additional metadata
  population?: number
  postalCodes?: string[]
  alternativeNames?: string[]
  overrideReason?: string
  effectiveDate?: string
}

export interface CityIndex {
  lastUpdated: string
  cities: Array<{
    id: string
    name: string
    parent: string
    province: string
    coordinates: Coordinates
    reference: string
    postalCodes?: string[]
    alternativeNames?: string[]
  }>
}

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