export interface Coordinates {
  lat: number
  lng: number
}

export interface ParkingSpot {
  location: string
  spots?: number
  coordinates?: Coordinates
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
  type?: 'official' | 'regulation' | 'news' | 'community'
  name?: string
  url?: string
  date?: string
}

export interface Contact {
  website: string
  email: string
  phone: string
}

/** Unknown facts are omitted. */
export interface ParkingRules {
  free?: boolean
  paid?: {
    enabled?: boolean
    areas?: string[]
    rates?: ParkingRates
  }
  permits?: {
    required?: boolean
    types?: string[]
  }
  restrictions?: {
    timeLimit?: number
    noParking?: NoParkingZone[]
  }
  motorcycleSpecific: {
    dedicatedSpots?: ParkingSpot[]
    allowedOnSidewalk?: boolean
    freeInPaidZones?: boolean
    notes: string
  }
}

export type ParkingStatusValue = 'sidewalk_allowed' | 'free_parking' | 'paid_parking' | 'no_info'

export interface Gemeente {
  id: string
  type?: 'gemeente' | 'country'
  name: string
  alternativeNames?: string[]
  searchOnlyNames?: string[]
  province: string
  coordinates: Coordinates
  parkingRules?: ParkingRules // optional — not present in lite index entries
  contact?: Contact
  lastUpdated?: string
  sources?: Source[]
  statcode?: string
  parkingStatus?: ParkingStatusValue // pre-computed in index; avoids loading full parkingRules for map rendering
  zoom?: number
}
