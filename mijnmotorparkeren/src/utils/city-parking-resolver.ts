// src/utils/city-parking-resolver.ts
import { Gemeente, ParkingRules } from '../types/gemeente'
import { City } from '../types/city'
import { getCitiesForGemeente } from '../data'
import type { Polygon, MultiPolygon } from 'geojson'

export interface ResolvedParkingInfo {
  gemeente: {
    id: string
    name: string
    rules: ParkingRules
  }
  city?: {
    id: string
    name: string
    rules: ParkingRules
  }
  // The final resolved rules (city overrides gemeente)
  activeRules: ParkingRules
  appliedLevel: 'gemeente' | 'city'
  appliedFor: string
}

/**
 * Load all cities for a gemeente
 */
async function loadCitiesForGemeente(gemeenteId: string): Promise<City[]> {
  // No more async! Data is already available via imports
  return getCitiesForGemeente(gemeenteId)
}

/**
 * Resolve parking rules for a specific location
 * This function determines whether to use gemeente or city-level rules
 */
export async function resolveParkingRules(
  gemeente: Gemeente,
  coordinates?: [number, number]
): Promise<ResolvedParkingInfo> {
  const result: ResolvedParkingInfo = {
    gemeente: {
      id: gemeente.id,
      name: gemeente.name,
      rules: gemeente.parkingRules
    },
    activeRules: gemeente.parkingRules,
    appliedLevel: 'gemeente',
    appliedFor: gemeente.name
  }

  try {
    // Try to find applicable city rules
    const cities = await loadCitiesForGemeente(gemeente.id)
    
    if (cities.length === 0) {
      console.log(`No cities found for gemeente ${gemeente.id}`)
      return result
    }

    console.log(`Found ${cities.length} cities for gemeente ${gemeente.id}:`, cities.map(c => c.name))

    // If coordinates provided, find the city that contains this point
    if (coordinates) {
      for (const city of cities) {
        if (isPointInCity(coordinates, city)) {
          result.city = {
            id: city.id,
            name: city.name,
            rules: city.parkingRules
          }
          result.activeRules = mergeParkingRules(gemeente.parkingRules, city.parkingRules)
          result.appliedLevel = 'city'
          result.appliedFor = city.name
          console.log(`Using city rules for ${city.name} at coordinates ${coordinates}`)
          break
        }
      }
    } else {
      // No coordinates provided, use the first city as default (usually centrum)
      const defaultCity = cities[0]
      result.city = {
        id: defaultCity.id,
        name: defaultCity.name,
        rules: defaultCity.parkingRules
      }
      result.activeRules = mergeParkingRules(gemeente.parkingRules, defaultCity.parkingRules)
      result.appliedLevel = 'city'
      result.appliedFor = defaultCity.name
      console.log(`Using default city rules for ${defaultCity.name}`)
    }

  } catch (error) {
    console.warn(`Error resolving parking rules for ${gemeente.id}:`, error)
    // Fallback to gemeente rules
  }

  return result
}

/**
 * Check if a point is within a city's boundaries
 * Handles FeatureCollection properly
 */
function isPointInCity(coordinates: [number, number], city: City): boolean {
  if (!city.area || !city.area.features) {
    console.warn(`City ${city.id} has no area data`)
    return false
  }

  const [lng, lat] = coordinates
  
  try {
    // Iterate through all features in the FeatureCollection
    for (const feature of city.area.features) {
      if (!feature.geometry) continue

      // Handle both Polygon and MultiPolygon geometries
      if (feature.geometry.type === 'Polygon') {
        const polygon = feature.geometry as Polygon
        if (isPointInPolygon([lng, lat], polygon.coordinates[0])) {
          return true
        }
      } else if (feature.geometry.type === 'MultiPolygon') {
        const multiPolygon = feature.geometry as MultiPolygon
        for (const polygon of multiPolygon.coordinates) {
          if (isPointInPolygon([lng, lat], polygon[0])) {
            return true
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Error checking point in city ${city.id}:`, error)
  }
  
  return false
}

/**
 * Simple ray casting algorithm for point-in-polygon test
 * polygon is an array of [lng, lat] coordinate pairs
 */
function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point
  let inside = false
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  
  return inside
}

/**
 * Merge gemeente and city parking rules (city overrides gemeente)
 */
function mergeParkingRules(gemeenteRules: ParkingRules, cityRules: ParkingRules): ParkingRules {
  return {
    // City rules take precedence over gemeente rules
    free: cityRules.free !== undefined ? cityRules.free : gemeenteRules.free,
    
    paid: {
      enabled: cityRules.paid?.enabled !== undefined ? cityRules.paid.enabled : gemeenteRules.paid.enabled,
      areas: cityRules.paid?.areas?.length ? cityRules.paid.areas : gemeenteRules.paid.areas,
      rates: cityRules.paid?.rates || gemeenteRules.paid.rates
    },
    
    permits: {
      required: cityRules.permits?.required !== undefined ? cityRules.permits.required : gemeenteRules.permits.required,
      types: cityRules.permits?.types?.length ? cityRules.permits.types : gemeenteRules.permits.types
    },
    
    restrictions: {
      timeLimit: cityRules.restrictions?.timeLimit || gemeenteRules.restrictions.timeLimit,
      // Combine no parking areas from both levels
      noParking: [
        ...(gemeenteRules.restrictions.noParking || []),
        ...(cityRules.restrictions?.noParking || [])
      ]
    },
    
    motorcycleSpecific: {
      // Combine dedicated spots from both levels
      dedicatedSpots: [
        ...(gemeenteRules.motorcycleSpecific.dedicatedSpots || []),
        ...(cityRules.motorcycleSpecific?.dedicatedSpots || [])
      ],
      
      // City rules override gemeente rules for boolean values
      allowedOnSidewalk: cityRules.motorcycleSpecific?.allowedOnSidewalk !== undefined 
        ? cityRules.motorcycleSpecific.allowedOnSidewalk 
        : gemeenteRules.motorcycleSpecific.allowedOnSidewalk,
        
      freeInPaidZones: cityRules.motorcycleSpecific?.freeInPaidZones !== undefined
        ? cityRules.motorcycleSpecific.freeInPaidZones
        : gemeenteRules.motorcycleSpecific.freeInPaidZones,
        
      // Use city notes if available, otherwise gemeente notes
      notes: cityRules.motorcycleSpecific?.notes || gemeenteRules.motorcycleSpecific.notes
    }
  }
}

/**
 * Get all cities for a gemeente (convenience function)
 */
export async function getAllCitiesForGemeente(gemeenteId: string): Promise<City[]> {
  return await loadCitiesForGemeente(gemeenteId)
}

/**
 * Find city by coordinates within a gemeente
 */
export async function findCityByCoordinates(
  gemeenteId: string, 
  coordinates: [number, number]
): Promise<City | null> {
  const cities = await loadCitiesForGemeente(gemeenteId)
  
  for (const city of cities) {
    if (isPointInCity(coordinates, city)) {
      return city
    }
  }
  
  return null
}

/**
 * Get parking rules for a specific location (convenience function)
 */
export async function getParkingRulesAtLocation(
  gemeente: Gemeente,
  coordinates?: [number, number]
): Promise<ParkingRules> {
  const resolved = await resolveParkingRules(gemeente, coordinates)
  return resolved.activeRules
}