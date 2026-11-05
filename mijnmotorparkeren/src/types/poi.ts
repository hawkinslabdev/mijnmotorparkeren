import type { Coordinates } from './gemeente'

export type POIType = 'freeStreetParking' | 'dedicatedMotorcycleSpot'

/** Whether a POI set is scoped to a gemeente or to a city. Prevents id/name
 *  collisions between the two (a gemeente and a city can share an id). */
export type POIScope = 'gemeente' | 'city'

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
  pois: Array<{
    municipalityId: string
    scope?: POIScope // defaults to 'gemeente' when absent
  }>
}

export const POI_TYPE_CONFIG: Record<
  POIType,
  {
    label: string
    color: string
    icon: string
    hollow: boolean
  }
> = {
  freeStreetParking: {
    label: 'Gratis straatparkeren',
    color: '#16a34a',
    icon: 'P',
    hollow: false,
  },
  dedicatedMotorcycleSpot: {
    label: 'Motorstalplaats',
    color: '#3b82f6',
    icon: 'M',
    hollow: true,
  },
}
