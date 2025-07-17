import fs from 'fs'
import path from 'path'
import { Gemeente } from '../src/types/gemeente'

interface CartomapFeature {
  type: 'Feature'
  properties: {
    statcode: string
    statnaam: string
    jrstatcode: string
    rubriek: string
    id: number
  }
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  id: string
}

interface CartomapData {
  type: 'FeatureCollection'
  features: CartomapFeature[]
}

async function fetchCartomapData(): Promise<CartomapData> {
  const response = await fetch('https://cartomap.github.io/nl/wgs84/gemeente_2025.geojson')
  return response.json()
}

function normalizeGemeenteName(name: string): string {
  return name
    .replace(/^gemeente\s+/i, '')
    .toLowerCase()
    .trim()
}

function matchGemeenteToCartomap(
  gemeenteData: Gemeente,
  cartomapFeatures: CartomapFeature[]
): CartomapFeature | null {
  const normalizedGemeenteName = normalizeGemeenteName(gemeenteData.name)
  
  return cartomapFeatures.find(feature => {
    const normalizedCartomapName = normalizeGemeenteName(feature.properties.statnaam)
    return normalizedCartomapName === normalizedGemeenteName
  }) || null
}

async function updateGemeenteData() {
  const cartomapData = await fetchCartomapData()
  const gemeentesDir = path.join(__dirname, '../data/gemeentes')
  const files = fs.readdirSync(gemeentesDir)
  
  const matchResults: Array<{
    file: string
    matched: boolean
    statcode?: string
    cartomapName?: string
  }> = []
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    
    const filePath = path.join(gemeentesDir, file)
    const gemeenteData: Gemeente = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    
    const match = matchGemeenteToCartomap(gemeenteData, cartomapData.features)
    
    if (match) {
      gemeenteData.statcode = match.properties.statcode
      if (!gemeenteData.parkingStatus) {
        gemeenteData.parkingStatus = 'grey'
      }
      
      fs.writeFileSync(filePath, JSON.stringify(gemeenteData, null, 2))
      
      matchResults.push({
        file,
        matched: true,
        statcode: match.properties.statcode,
        cartomapName: match.properties.statnaam
      })
    } else {
      matchResults.push({
        file,
        matched: false
      })
    }
  }
  
  console.log('Matching results:')
  matchResults.forEach(result => {
    if (result.matched) {
      console.log(`✓ ${result.file} → ${result.statcode} (${result.cartomapName})`)
    } else {
      console.log(`✗ ${result.file} → No match found`)
    }
  })
  
  const matched = matchResults.filter(r => r.matched).length
  const total = matchResults.length
  console.log(`\nMatched ${matched}/${total} gemeentes`)
}

if (require.main === module) {
  updateGemeenteData().catch(console.error)
}

export { updateGemeenteData, matchGemeenteToCartomap }