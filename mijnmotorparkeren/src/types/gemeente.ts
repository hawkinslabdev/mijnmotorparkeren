// src/types/gemeente.ts

export interface Coordinates {
  lat: number
  lng: number
}

export interface ParkingSpot {
  location: string
  spots: number
  coordinates: Coordinates
}

export interface NoParkingZone {
  location: string
  days?: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'>
  times?: string
}

export interface ParkingRates {
  hourly: number
  daily?: number
  currency: 'EUR'
}

export interface Source {
  type: 'official' | 'regulation' | 'news' | 'community'
  name?: string
  url: string
  date: string
}

export interface Contact {
  website: string
  email: string
  phone: string
}

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface ParkingRules {
  free: boolean
  paid: {
    enabled: boolean
    areas: string[]
    rates: ParkingRates | null
  }
  permits: {
    required: boolean
    types: string[]
  }
  restrictions: {
    timeLimit: number | null
    noParking: NoParkingZone[]
  }
  motorcycleSpecific: {
    dedicatedSpots: ParkingSpot[]
    allowedOnSidewalk: boolean
    freeInPaidZones: boolean
    notes: string
  }
}

export interface Gemeente {
  id: string
  name: string
  province: string
  coordinates: Coordinates
  boundaries: GeoJSONPolygon
  parkingRules: ParkingRules
  contact?: Contact
  lastUpdated: string
  sources: Source[]
  statcode?: string // Added for compatibility with official boundaries
  parkingStatus?: string // Added for compatibility with scripts
}

export interface GemeenteIndex {
  version: string
  lastGenerated: string
  total: number
  gemeentes: Array<{
    id: string
    name: string
    province: string
    coordinates: Coordinates
  }>
}