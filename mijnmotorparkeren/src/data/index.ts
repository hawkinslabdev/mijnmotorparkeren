// src/data/index.ts
import type { Gemeente } from '../types/gemeente'
import type { City } from '../types/city'

// Use VITE_DATA_VERSION from .env for cache busting, fallback to a default date if empty
let DATA_VERSION = import.meta.env.VITE_DATA_VERSION;
if (!DATA_VERSION || DATA_VERSION.trim() === '') {
  // Fallback: use a fixed default date string (e.g. project epoch or last known update)
  DATA_VERSION = '20250101';
}

// Helper to generate versioned URLs for gemeente/city JSON files
export function getVersionedJsonUrl(type: 'gemeentes' | 'city', id: string) {
  return `/data/${type}/${id}.json?v=${DATA_VERSION}`;
}

// Import all gemeente JSON files automatically (static glob)
const gemeenteModules = import.meta.glob('../../data/gemeentes/*.json', { 
  eager: true,
  import: 'default'
})

// Import all city JSON files automatically (static glob)
const cityModules = import.meta.glob('../../data/city/*.json', { 
  eager: true,
  import: 'default'
})

// Convert to typed arrays and filter out index files
export const gemeenteArray = Object.entries(gemeenteModules)
  .filter(([path]) => !path.includes('index.json'))
  .map(([, module]) => module as Gemeente)

export const cityArray = Object.entries(cityModules)
  .filter(([path]) => !path.includes('index.json'))
  .map(([, module]) => module as City)

// Create gemeente index from loaded data
export const gemeenteIndex = {
  version: '1.0.0',
  lastGenerated: new Date().toISOString(),
  total: gemeenteArray.length,
  gemeentes: gemeenteArray.map(g => ({
    id: g.id,
    name: g.name,
    province: g.province,
    coordinates: g.coordinates
  }))
}

// Create city index from loaded data
export const cityIndex = {
  version: '1.0.0',
  lastGenerated: new Date().toISOString(),
  total: cityArray.length,
  cities: cityArray.map(c => ({
    id: c.id,
    name: c.name,
    parent: c.parent,
    reference: `city/${c.id}.json`
  }))
}

// Helper functions for instant lookups
export const getGemeenteById = (id: string): Gemeente | null => 
  gemeenteArray.find(g => g.id === id) || null

export const getCityById = (id: string): City | null => 
  cityArray.find(c => c.id === id) || null

export const getCitiesForGemeente = (gemeenteId: string): City[] =>
  cityArray.filter(c => c.parent === gemeenteId)

export const getAllGemeentes = (): Gemeente[] => gemeenteArray

export const getAllCities = (): City[] => cityArray

// Debug info
console.log(`📦 Data bundle loaded:`)
console.log(`  • ${gemeenteArray.length} gemeentes`)
console.log(`  • ${cityArray.length} cities`) 