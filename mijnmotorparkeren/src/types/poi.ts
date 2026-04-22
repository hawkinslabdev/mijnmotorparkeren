import type { Coordinates } from './gemeente'

export type POIType = 'freeStreetParking' | 'dedicatedMotorcycleSpot'

export interface POI {
  id: string
  type: POIType
  name: string
  description?: string
  coordinates: Coordinates
  municipalityId: string
  address?: string
  capacity?: number
  source?: {
    type: 'official' | 'community' | 'reddit'
    url?: string
    date?: string
  }
}

export interface POIIndex {
  version: string
  lastGenerated: string
  total: number
  pois: Array<{
    id: string
    municipalityId: string
    type: POIType
    name: string
  }>
}

export const POI_TYPE_CONFIG: Record<
  POIType,
  {
    label: string
    color: string
    icon: string
  }
> = {
  freeStreetParking: {
    label: 'Gratis straatparkeren',
    color: '#22c55e',
    icon: 'P',
  },
  dedicatedMotorcycleSpot: {
    label: 'Motorstalplaats',
    color: '#3b82f6',
    icon: 'M',
  },
}
