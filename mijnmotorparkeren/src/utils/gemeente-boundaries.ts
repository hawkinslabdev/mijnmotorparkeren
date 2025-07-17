// src/utils/gemeente-boundaries.ts
import { Gemeente } from '@/types/gemeente'
import type * as GeoJSON from 'geojson'

export interface BoundarySource {
  name: string
  url: string
  year: number
  format: 'geojson' | 'topojson'
  projection: 'wgs84' | 'rd'
  filename: string
}

// Official Dutch gemeente boundary sources
export const BOUNDARY_SOURCES: BoundarySource[] = [
  {
    name: 'CartoMap (Simplified)',
    url: 'https://cartomap.github.io/nl/wgs84/gemeente_2025.geojson',
    year: 2023,
    format: 'geojson',
    projection: 'wgs84',
    filename: 'gemeente_boundaries_simplified.geojson'
  },
  {
    name: 'CBS/PDOK Official',
    url: 'https://geodata.nationaalgeoregister.nl/cbsgebiedsindelingen/wfs?request=GetFeature&service=WFS&version=2.0.0&typeName=cbs_gemeente_2023_gegeneraliseerd&outputFormat=json',
    year: 2023,
    format: 'geojson',
    projection: 'wgs84',
    filename: 'gemeente_boundaries_detailed.geojson'
  }
]

/**
 * Cache management for boundary data
 */
export class BoundaryCache {
  private static instance: BoundaryCache
  private cache = new Map<string, GeoJSON.FeatureCollection>()
  private readonly CACHE_KEY = 'gemeente-boundaries-cache'
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

  static getInstance(): BoundaryCache {
    if (!BoundaryCache.instance) {
      BoundaryCache.instance = new BoundaryCache()
    }
    return BoundaryCache.instance
  }

  async get(sourceUrl: string): Promise<GeoJSON.FeatureCollection | null> {
    // Check memory cache first
    if (this.cache.has(sourceUrl)) {
      return this.cache.get(sourceUrl)!
    }

    // Check localStorage cache
    try {
      const cached = localStorage.getItem(`${this.CACHE_KEY}-${btoa(sourceUrl)}`)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        
        // Check if cache is still valid
        if (Date.now() - timestamp < this.CACHE_EXPIRY) {
          this.cache.set(sourceUrl, data)
          return data
        }
      }
    } catch (error) {
      console.warn('Failed to read from cache:', error)
    }

    return null
  }

  set(sourceUrl: string, data: GeoJSON.FeatureCollection): void {
    // Store in memory
    this.cache.set(sourceUrl, data)

    // Store in localStorage
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(
        `${this.CACHE_KEY}-${btoa(sourceUrl)}`,
        JSON.stringify(cacheEntry)
      )
    } catch (error) {
      console.warn('Failed to write to cache:', error)
    }
  }

  clear(): void {
    this.cache.clear()
    
    // Clear localStorage entries
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.CACHE_KEY)) {
        localStorage.removeItem(key)
      }
    }
  }
}

/**
 * Fetches boundaries: tries local cache first, then external source, then localStorage cache
 */
export async function fetchGemeenteBoundaries(
  sourceIndex: number = 0
): Promise<GeoJSON.FeatureCollection | null> {
  const source = BOUNDARY_SOURCES[sourceIndex]
  
  if (!source) {
    console.error('Invalid boundary source index:', sourceIndex)
    return null
  }

  const cache = BoundaryCache.getInstance()

  // Step 1: Try localStorage cache first
  const cachedData = await cache.get(source.url)
  if (cachedData) {
    console.log(`✓ Loaded ${cachedData.features?.length || 0} boundaries from localStorage cache`)
    return cachedData
  }

  // Step 2: Try local static file cache
  try {
    const localPath = `/data/boundaries/${source.filename}`
    const response = await fetch(localPath)
    
    if (response.ok) {
      const data = await response.json()
      
      if (data.type === 'FeatureCollection' && data.features?.length > 0) {
        console.log(`✓ Loaded ${data.features.length} boundaries from local file cache`)
        // Cache it for next time
        cache.set(source.url, data)
        return data
      }
    }
  } catch {
    console.log(`Local file cache miss for ${source.name}`)
  }

  // Step 3: Fetch from external source
  try {
    console.log(`Fetching gemeente boundaries from: ${source.name}`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, application/geo+json',
        'User-Agent': 'MijnMotorParkeren/1.0'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Validate that we received GeoJSON
    if (!data.type || data.type !== 'FeatureCollection') {
      throw new Error('Invalid GeoJSON FeatureCollection received')
    }
    
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('No features found in GeoJSON')
    }
    
    console.log(`✓ Fetched ${data.features.length} boundaries from ${source.name}`)
    
    // Cache the fetched data
    cache.set(source.url, data)
    
    return data
    
  } catch (error) {
    console.error(`Failed to fetch from ${source.name}:`, error)
    
    // Step 4: Try fallback source
    if (sourceIndex < BOUNDARY_SOURCES.length - 1) {
      console.log('Trying fallback source...')
      return fetchGemeenteBoundaries(sourceIndex + 1)
    }
    
    return null
  }
}

/**
 * Creates fallback boundaries from gemeente data files
 */
export function createFallbackBoundaries(gemeentes: Gemeente[]): GeoJSON.FeatureCollection {
  console.log(`Creating fallback boundaries for ${gemeentes.length} gemeentes`)
  
  const features: GeoJSON.Feature[] = gemeentes.map(gemeente => {
    // If gemeente has boundary data, use it
    if (gemeente.boundaries) {
      return {
        type: 'Feature',
        properties: {
          GM_NAAM: gemeente.name,
          GM_CODE: gemeente.id,
          PROV_NAAM: gemeente.province,
          id: gemeente.id
        },
        geometry: gemeente.boundaries
      }
    }
    
    // Otherwise create a simple circular boundary around the center point
    const { lat, lng } = gemeente.coordinates
    const radius = 0.02 // roughly 2km radius in degrees
    
    const points: [number, number][] = []
    for (let i = 0; i <= 20; i++) {
      const angle = (i / 20) * 2 * Math.PI
      const x = lng + radius * Math.cos(angle)
      const y = lat + radius * Math.sin(angle)
      points.push([x, y])
    }
    
    return {
      type: 'Feature',
      properties: {
        GM_NAAM: gemeente.name,
        GM_CODE: gemeente.id,
        PROV_NAAM: gemeente.province,
        id: gemeente.id
      },
      geometry: {
        type: 'Polygon',
        coordinates: [points]
      }
    }
  })

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Matches gemeente data with boundary features
 */
export function matchGemeenteWithBoundary(
  gemeente: Gemeente,
  boundaryFeature: GeoJSON.Feature
): boolean {
  const props = boundaryFeature.properties
  
  if (!props) return false
  
  // Try different property name variations used by different sources
  const boundaryId = props.GM_CODE || props.gemeentecode || props.code || props.id
  const boundaryName = props.GM_NAAM || props.gemeentenaam || props.name
  
  // Match by ID first (most reliable)
  if (boundaryId && gemeente.id === boundaryId.toLowerCase()) {
    return true
  }
  
  // Fallback to name matching (normalize for comparison)
  if (boundaryName) {
    const normalizedBoundaryName = boundaryName.toLowerCase()
      .replace(/gemeente\s+/i, '')
      .trim()
    const normalizedGemeenteName = gemeente.name.toLowerCase()
      .replace(/gemeente\s+/i, '')
      .trim()
    
    return normalizedBoundaryName === normalizedGemeenteName
  }
  
  return false
}

/**
 * Gets exact boundaries for a specific gemeente
 */
export async function getGemeenteBoundary(
  gemeenteId: string
): Promise<GeoJSON.Polygon | null> {
  try {
    // For single gemeente, we can use Nominatim API for exact boundaries
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${gemeenteId}+gemeente+netherlands&` +
      `format=geojson&` +
      `polygon_geojson=1&` +
      `addressdetails=1&` +
      `limit=1`
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        return feature.geometry
      }
    }
    
    return null
    
  } catch (error) {
    console.error(`Failed to fetch boundary for ${gemeenteId}:`, error)
    return null
  }
}

/**
 * Validates boundary data
 */
export function validateBoundary(boundary: GeoJSON.Polygon): boolean {
  if (!boundary || boundary.type !== 'Polygon') {
    return false
  }
  
  if (!boundary.coordinates || !Array.isArray(boundary.coordinates)) {
    return false
  }
  
  // Check that we have at least one ring
  if (boundary.coordinates.length === 0) {
    return false
  }
  
  // Check that the outer ring has at least 4 coordinates (triangle + close)
  const outerRing = boundary.coordinates[0]
  if (!Array.isArray(outerRing) || outerRing.length < 4) {
    return false
  }
  
  // Check that coordinates are valid [lng, lat] pairs
  return outerRing.every(coord => 
    Array.isArray(coord) && 
    coord.length === 2 && 
    typeof coord[0] === 'number' && 
    typeof coord[1] === 'number' &&
    coord[0] >= -180 && coord[0] <= 180 &&
    coord[1] >= -90 && coord[1] <= 90
  )
}