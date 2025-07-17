// scripts/generate-boundaries.ts
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Gemeente } from '../src/types/gemeente.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

interface BoundarySource {
  name: string
  url: string
  description: string
}

const BOUNDARY_SOURCES: BoundarySource[] = [
  {
    name: 'cartomap-github',
    url: 'https://cartomap.github.io/nl/wgs84/gemeente_2025.geojson',
    description: 'CartoMap (Simplified, good for web use)'
  },
  {
    name: 'cbs-pdok',
    url: 'https://geodata.nationaalgeoregister.nl/cbsgebiedsindelingen/wfs?request=GetFeature&service=WFS&version=2.0.0&typeName=cbs_gemeente_2023_gegeneraliseerd&outputFormat=json',
    description: 'CBS/PDOK Official (High detail)'
  }
]

/**
 * Fetches gemeente boundaries from official sources
 */
async function fetchBoundaries(sourceIndex: number = 0): Promise<any> {
  const source = BOUNDARY_SOURCES[sourceIndex]
  
  console.log(`${colors.blue}📡 Fetching boundaries from: ${source.description}${colors.reset}`)
  console.log(`   URL: ${source.url}`)
  
  try {
    const response = await fetch(source.url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.type || data.type !== 'FeatureCollection') {
      throw new Error('Invalid GeoJSON FeatureCollection')
    }
    
    console.log(`${colors.green}✓ Successfully loaded ${data.features?.length || 0} gemeente boundaries${colors.reset}`)
    return data
    
  } catch (error) {
    console.log(`${colors.red}✗ Failed to fetch from ${source.name}: ${error}${colors.reset}`)
    
    // Try fallback source
    if (sourceIndex < BOUNDARY_SOURCES.length - 1) {
      console.log(`${colors.yellow}⚠ Trying fallback source...${colors.reset}`)
      return fetchBoundaries(sourceIndex + 1)
    }
    
    throw error
  }
}

/**
 * Matches gemeente names with boundary features
 */
function findMatchingBoundary(gemeente: Gemeente, boundaries: any): any {
  const features = boundaries.features || []
  
  for (const feature of features) {
    const props = feature.properties || {}
    
    // Try different property names used by different sources
    const boundaryName = props.GM_NAAM || props.gemeentenaam || props.name || ''
    const boundaryCode = props.GM_CODE || props.gemeentecode || props.code || ''
    
    // Match by municipality name (normalize for comparison)
    const normalizedBoundaryName = boundaryName.toLowerCase()
      .replace(/gemeente\s+/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    const normalizedGemeenteName = gemeente.name.toLowerCase()
      .replace(/gemeente\s+/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    // Direct name match
    if (normalizedBoundaryName === normalizedGemeenteName) {
      return feature
    }
    
    // Match by code if available
    if (boundaryCode && gemeente.id === boundaryCode.toLowerCase()) {
      return feature
    }
    
    // Partial name match for complex names
    if (normalizedBoundaryName.includes(normalizedGemeenteName) || 
        normalizedGemeenteName.includes(normalizedBoundaryName)) {
      return feature
    }
  }
  
  return null
}

/**
 * Gets accurate boundary for Zeewolde specifically
 */
async function getZeewoldeBoundary(): Promise<any> {
  console.log(`${colors.cyan}🎯 Getting precise boundary for Zeewolde...${colors.reset}`)
  
  try {
    // Use Nominatim for precise boundary
    const nominatimUrl = 'https://nominatim.openstreetmap.org/search?' +
      'q=Zeewolde+gemeente+Netherlands&' +
      'format=geojson&' +
      'polygon_geojson=1&' +
      'addressdetails=1&' +
      'limit=1'
    
    const response = await fetch(nominatimUrl)
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      console.log(`${colors.green}✓ Found precise Zeewolde boundary via Nominatim${colors.reset}`)
      return feature.geometry
    }
    
    throw new Error('No boundary found in Nominatim response')
    
  } catch (error) {
    console.log(`${colors.yellow}⚠ Nominatim failed: ${error}${colors.reset}`)
    
    // Fallback to more accurate manual boundary for Zeewolde
    console.log(`${colors.yellow}📍 Using improved manual boundary for Zeewolde${colors.reset}`)
    
    return {
      type: 'Polygon',
      coordinates: [[
        [5.4792, 52.2891],  // Southwest corner
        [5.6092, 52.2891],  // Southeast corner
        [5.6092, 52.3791],  // Northeast corner
        [5.4792, 52.3791],  // Northwest corner
        [5.4792, 52.2891]   // Close the polygon
      ]]
    }
  }
}

/**
 * Updates gemeente data files with real boundaries
 */
async function updateGemeenteFile(gemeente: Gemeente, newBoundary: any): Promise<void> {
  const filePath = path.join(__dirname, '..', 'data', 'gemeentes', `${gemeente.id}.json`)
  
  try {
    const updatedGemeente: Gemeente = {
      ...gemeente,
      boundaries: newBoundary,
      lastUpdated: new Date().toISOString().split('T')[0] // Update timestamp
    }
    
    await fs.writeFile(filePath, JSON.stringify(updatedGemeente, null, 2))
    console.log(`${colors.green}✓ Updated ${gemeente.name} boundary data${colors.reset}`)
    
  } catch (error) {
    console.log(`${colors.red}✗ Failed to update ${gemeente.name}: ${error}${colors.reset}`)
    throw error
  }
}

/**
 * Main function to generate all boundaries
 */
async function generateBoundaries(): Promise<void> {
  console.log(`${colors.bright}${colors.blue}🗺️  Gemeente Boundary Generator${colors.reset}`)
  console.log(`${colors.bright}================================${colors.reset}\n`)
  
  try {
    // Load existing gemeente data
    console.log(`${colors.blue}📁 Loading existing gemeente data...${colors.reset}`)
    const dataDir = path.join(__dirname, '..', 'data', 'gemeentes')
    const files = await fs.readdir(dataDir)
    const jsonFiles = files.filter(file => file.endsWith('.json'))
    
    if (jsonFiles.length === 0) {
      throw new Error('No gemeente data files found')
    }
    
    const gemeentes: Gemeente[] = []
    
    for (const file of jsonFiles) {
      const filePath = path.join(dataDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const gemeente = JSON.parse(content) as Gemeente
      gemeentes.push(gemeente)
    }
    
    console.log(`${colors.green}✓ Loaded ${gemeentes.length} gemeente data files${colors.reset}\n`)
    
    // Fetch official boundary data
    console.log(`${colors.blue}🌍 Fetching official gemeente boundaries...${colors.reset}`)
    const boundariesData = await fetchBoundaries()
    
    console.log(`\n${colors.blue}🔄 Processing gemeente boundaries...${colors.reset}`)
    
    let updatedCount = 0
    let skippedCount = 0
    
    for (const gemeente of gemeentes) {
      console.log(`\n${colors.cyan}Processing: ${gemeente.name}${colors.reset}`)
      
      try {
        let newBoundary = null
        
        // Special handling for Zeewolde to get the most accurate boundary
        if (gemeente.id === 'zeewolde') {
          newBoundary = await getZeewoldeBoundary()
          // Add small delay to be nice to APIs
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          // Find matching boundary in the official data
          const matchingFeature = findMatchingBoundary(gemeente, boundariesData)
          
          if (matchingFeature) {
            newBoundary = matchingFeature.geometry
            console.log(`${colors.green}✓ Found matching boundary in official data${colors.reset}`)
          } else {
            console.log(`${colors.yellow}⚠ No matching boundary found, keeping existing${colors.reset}`)
            skippedCount++
            continue
          }
        }
        
        if (newBoundary) {
          await updateGemeenteFile(gemeente, newBoundary)
          updatedCount++
        }
        
      } catch (error) {
        console.log(`${colors.red}✗ Error processing ${gemeente.name}: ${error}${colors.reset}`)
        skippedCount++
      }
    }
    
    // Summary
    console.log(`\n${colors.bright}${colors.green}🎉 Boundary generation complete!${colors.reset}`)
    console.log(`${colors.green}✓ Updated: ${updatedCount} gemeentes${colors.reset}`)
    if (skippedCount > 0) {
      console.log(`${colors.yellow}⚠ Skipped: ${skippedCount} gemeentes${colors.reset}`)
    }
    
    // Update index file
    console.log(`\n${colors.blue}📝 Updating index file...${colors.reset}`)
    await updateIndexFile(gemeentes)
    
    console.log(`${colors.bright}${colors.green}✅ All done!${colors.reset}`)
    
  } catch (error) {
    console.log(`\n${colors.red}❌ Error: ${error}${colors.reset}`)
    process.exit(1)
  }
}

/**
 * Updates the main index file
 */
async function updateIndexFile(gemeentes: Gemeente[]): Promise<void> {
  const indexPath = path.join(__dirname, '..', 'data', 'index.json')
  
  const indexData = {
    version: '1.0.0',
    lastGenerated: new Date().toISOString().split('T')[0],
    total: gemeentes.length,
    gemeentes: gemeentes.map(g => ({
      id: g.id,
      name: g.name,
      province: g.province,
      coordinates: g.coordinates
    }))
  }
  
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2))
  console.log(`${colors.green}✓ Updated index file with ${gemeentes.length} gemeentes${colors.reset}`)
}

/**
 * Command line interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.bright}Gemeente Boundary Generator${colors.reset}

Usage: npm run generate:boundaries [options]

Options:
  --help, -h     Show this help message
  --zeewolde     Only update Zeewolde boundary
  --validate     Validate existing boundaries without updating

Examples:
  npm run generate:boundaries
  npm run generate:boundaries -- --zeewolde
  npm run generate:boundaries -- --validate
`)
    return
  }
  
  if (args.includes('--zeewolde')) {
    console.log(`${colors.bright}${colors.cyan}🎯 Updating Zeewolde boundary only${colors.reset}\n`)
    
    try {
      // Load Zeewolde data
      const zeewoldePath = path.join(__dirname, '..', 'data', 'gemeentes', 'zeewolde.json')
      const content = await fs.readFile(zeewoldePath, 'utf-8')
      const zeewolde = JSON.parse(content) as Gemeente
      
      // Get new boundary
      const newBoundary = await getZeewoldeBoundary()
      
      // Update file
      await updateGemeenteFile(zeewolde, newBoundary)
      
      console.log(`\n${colors.bright}${colors.green}✅ Zeewolde boundary updated!${colors.reset}`)
      
    } catch (error) {
      console.log(`\n${colors.red}❌ Error: ${error}${colors.reset}`)
      process.exit(1)
    }
    
    return
  }
  
  if (args.includes('--validate')) {
    console.log(`${colors.bright}${colors.blue}🔍 Validating existing boundaries${colors.reset}\n`)
    
    try {
      const dataDir = path.join(__dirname, '..', 'data', 'gemeentes')
      const files = await fs.readdir(dataDir)
      const jsonFiles = files.filter(file => file.endsWith('.json'))
      
      let validCount = 0
      let invalidCount = 0
      
      for (const file of jsonFiles) {
        const filePath = path.join(dataDir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const gemeente = JSON.parse(content) as Gemeente
        
        if (validateBoundary(gemeente.boundaries)) {
          console.log(`${colors.green}✓ ${gemeente.name} - Valid boundary${colors.reset}`)
          validCount++
        } else {
          console.log(`${colors.red}✗ ${gemeente.name} - Invalid boundary${colors.reset}`)
          invalidCount++
        }
      }
      
      console.log(`\n${colors.bright}Summary:${colors.reset}`)
      console.log(`${colors.green}✓ Valid: ${validCount}${colors.reset}`)
      console.log(`${colors.red}✗ Invalid: ${invalidCount}${colors.reset}`)
      
    } catch (error) {
      console.log(`\n${colors.red}❌ Error: ${error}${colors.reset}`)
      process.exit(1)
    }
    
    return
  }
  
  // Default: generate all boundaries
  await generateBoundaries()
}

/**
 * Simple boundary validation
 */
function validateBoundary(boundary: any): boolean {
  if (!boundary || typeof boundary !== 'object') {
    return false
  }
  
  if (boundary.type !== 'Polygon' && boundary.type !== 'MultiPolygon') {
    return false
  }
  
  if (!boundary.coordinates || !Array.isArray(boundary.coordinates)) {
    return false
  }
  
  return boundary.coordinates.length > 0
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}