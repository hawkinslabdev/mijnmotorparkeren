// src/utils/gemeenteUtils.ts
import { Gemeente } from '@/types/gemeente'
import { City } from '@/types/city'

/**
 * Get parking status for a gemeente OR city with CORRECT priority logic
 * For cities: use city's own parking rules (overrides parent gemeente)
 * For gemeentes: use gemeente's parking rules
 * Priority: allowedOnSidewalk > free parking > paid parking > unknown
 */
export function getParkingStatus(entity: Gemeente | City): {
  status: 'sidewalk_allowed' | 'free_parking' | 'paid_parking' | 'no_info'
  label: string
  colorClass: string
} {
  const parkingRules = entity.parkingRules
  const motorcycleRules = parkingRules?.motorcycleSpecific
  
  // Check if this is a city (has parent property)
  const isCity = 'parent' in entity && entity.parent
  
  // No parking rules available
  if (!parkingRules) {
    return {
      status: 'no_info',
      label: 'Geen informatie',
      colorClass: 'bg-gray-100 text-gray-800'
    }
  }

  // PRIORITY 1: Check if regular parking is free
  if (
    (parkingRules.free === true || motorcycleRules?.freeInPaidZones === true) &&
    motorcycleRules?.allowedOnSidewalk === true
  ) {
    return {
      status: 'free_parking',
      label: isCity ? `${entity.name}: Gratis parkeren` : 'Gratis in het vak parkeren',
      colorClass: 'bg-green-100 text-green-800'
    }
  }

  // PRIORITY 2: Check sidewalk parking (most important for motorcycles)
  if (motorcycleRules?.allowedOnSidewalk === true) {
    return {
      status: 'sidewalk_allowed',
      label: isCity ? `${entity.name}: Parkeren op stoep toegestaan` : 'Parkeren op stoep toegestaan',
      colorClass: 'bg-blue-100 text-blue-800'
    }
  }

  // PRIORITY 3: Paid parking required
  if (parkingRules.paid?.enabled === true || parkingRules.free === false) {
    return {
      status: 'paid_parking',
      label: isCity ? `${entity.name}: Betaald parkeren` : 'Betaald parkeren',
      colorClass: 'bg-red-100 text-red-800'
    }
  }

  // FALLBACK: Unknown status
  return {
    status: 'no_info',
    label: 'Geen informatie',
    colorClass: 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get map boundary colors based on parking status
 */
export function getMapBoundaryColors(entity: Gemeente | City): {
  fillColor: string
  borderColor: string
} {
  const status = getParkingStatus(entity)
  
  const colorMap = {
    'sidewalk_allowed': { 
      fillColor: '#dbeafe',  // blue-100
      borderColor: '#2563eb' // blue-600
    },
    'free_parking': { 
      fillColor: '#dcfce7',  // green-100  
      borderColor: '#16a34a' // green-600
    },
    'paid_parking': { 
      fillColor: '#fee2e2',  // red-100
      borderColor: '#dc2626' // red-600
    },
    'no_info': { 
      fillColor: '#f3f4f6',  // gray-100
      borderColor: '#9ca3af' // gray-400
    }
  }
  
  return colorMap[status.status]
}

/**
 * Check if entity (gemeente or city) has dedicated motorcycle spots
 */
export function hasDedicatedMotorcycleSpots(entity: Gemeente | City): boolean {
  return entity.parkingRules?.motorcycleSpecific?.dedicatedSpots?.length > 0 || false
}

/**
 * Get motorcycle specific info with safe fallbacks
 */
export function getMotorcycleInfo(entity: Gemeente | City): {
  dedicatedSpots: number
  allowedOnSidewalk: boolean
  freeInPaidZones: boolean
  notes: string
} {
  const motorcycleRules = entity.parkingRules?.motorcycleSpecific
  
  if (!motorcycleRules) {
    return {
      dedicatedSpots: 0,
      allowedOnSidewalk: false,
      freeInPaidZones: false,
      notes: 'No motorcycle-specific information available'
    }
  }

  return {
    dedicatedSpots: motorcycleRules.dedicatedSpots?.length || 0,
    allowedOnSidewalk: motorcycleRules.allowedOnSidewalk || false,
    freeInPaidZones: motorcycleRules.freeInPaidZones || false,
    notes: motorcycleRules.notes || ''
  }
}

/**
 * Create a fallback gemeente object with minimal data
 */
export function createFallbackGemeente(): null {
  // No fallback gemeente should be created
  return null;
}

/**
 * Validate if gemeente has minimum required data
 */
export function isValidGemeente(gemeente: unknown): gemeente is Gemeente {
  if (typeof gemeente !== 'object' || gemeente === null) return false

  const g = gemeente as Record<string, unknown>
  return (
    typeof g.id === 'string' &&
    typeof g.name === 'string' &&
    typeof g.province === 'string' &&
    typeof (g.coordinates as Record<string, unknown>)?.lat === 'number' &&
    typeof (g.coordinates as Record<string, unknown>)?.lng === 'number'
  )
}

/**
 * Validate if city has minimum required data
 */
export function isValidCity(city: unknown): city is City {
  if (typeof city !== 'object' || city === null) return false

  const c = city as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.parent === 'string' &&
    typeof (c.coordinates as Record<string, unknown>)?.lat === 'number' &&
    typeof (c.coordinates as Record<string, unknown>)?.lng === 'number'
  )
}

/**
 * Get display name for gemeente or city
 */
export function getGemeenteDisplayName(entity: Gemeente | City): string {
  // Check if it's a city
  if ('parent' in entity && entity.parent) {
    return entity.name // Cities don't need "Gemeente" prefix
  }
  
  // It's a gemeente
  return entity.name.startsWith('Gemeente ') ? entity.name : `Gemeente ${entity.name}`
}

/**
 * Check if entity is a city (has parent property)
 */
export function isCity(entity: Gemeente | City): entity is City {
  return 'parent' in entity && typeof entity.parent === 'string'
}

/**
 * Check if entity is a gemeente (no parent property)
 */
export function isGemeente(entity: Gemeente | City): entity is Gemeente {
  return !('parent' in entity)
}