// scripts/validate-data.ts
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

// Define the schema for gemeente data validation
const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
})

const ParkingSpotSchema = z.object({
  location: z.string(),
  spots: z.number().positive(),
  coordinates: CoordinatesSchema
})

const NoParkingSchema = z.object({
  location: z.string(),
  days: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).optional(),
  times: z.string().optional()
})

const SourceSchema = z.object({
  type: z.enum(['official', 'regulation', 'news', 'community']),
  name: z.string().optional(),
  url: z.string().url(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

const GeoJSONSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()])))
})

const GemeenteSchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  name: z.string().startsWith('Gemeente '),
  province: z.enum([
    'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen',
    'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel',
    'Utrecht', 'Zeeland', 'Zuid-Holland'
  ]),
  coordinates: CoordinatesSchema,
  boundaries: GeoJSONSchema,
  parkingRules: z.object({
    free: z.boolean().nullable(),
    paid: z.object({
      enabled: z.boolean().nullable(),
      areas: z.array(z.string()),
      rates: z.object({
        hourly: z.number(),
        daily: z.number().optional(),
        currency: z.literal('EUR')
      }).nullable()
    }),
    permits: z.object({
      required: z.boolean().nullable(),
      types: z.array(z.string())
    }),
    restrictions: z.object({
      timeLimit: z.number().nullable(),
      noParking: z.array(NoParkingSchema)
    }),
    motorcycleSpecific: z.object({
      dedicatedSpots: z.array(ParkingSpotSchema),
      allowedOnSidewalk: z.boolean().nullable(),
      freeInPaidZones: z.boolean().nullable(),
      notes: z.string()
    })
  }),
  contact: z.object({
    website: z.string().url(),
    email: z.string().email(),
    phone: z.string()
  }).optional(),
  lastUpdated: z.string().regex(/^(\d{4}-\d{2}-\d{2})$/).nullable(),
  sources: z.array(SourceSchema)
})

// --- City validation schemas ---
const CitySchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  parent: z.string().regex(/^[a-z-]+$/),
  name: z.string().min(1),
  province: z.enum([
    'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen',
    'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel',
    'Utrecht', 'Zeeland', 'Zuid-Holland'
  ]),
  coordinates: z.object({
    lat: z.number().min(50.7).max(53.6),
    lng: z.number().min(3.3).max(7.3)
  }),
  parkingRules: z.object({
    free: z.boolean(),
    paid: z.object({
      enabled: z.boolean(),
      areas: z.array(z.string()),
      rates: z.object({
        hourly: z.number(),
        daily: z.number().optional(),
        currency: z.literal('EUR')
      }).nullable()
    }),
    permits: z.object({
      required: z.boolean(),
      types: z.array(z.string())
    }),
    restrictions: z.object({
      timeLimit: z.number().nullable(),
      noParking: z.array(z.object({
        location: z.string(),
        days: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).optional(),
        times: z.string().optional()
      }))
    }),
    motorcycleSpecific: z.object({
      dedicatedSpots: z.array(z.object({
        location: z.string(),
        spots: z.number().positive(),
        coordinates: z.object({
          lat: z.number().min(50.7).max(53.6),
          lng: z.number().min(3.3).max(7.3)
        })
      })),
      allowedOnSidewalk: z.boolean(),
      freeInPaidZones: z.boolean(),
      notes: z.string()
    })
  }),
  area: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.object({
      type: z.literal('Feature'),
      geometry: z.object({
        type: z.enum(['Polygon', 'MultiPolygon']),
        coordinates: z.any() // Simplified for Phase 1
      }),
      properties: z.object({}).optional()
    }))
  }),
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sources: z.array(z.object({
    type: z.enum(['official', 'regulation', 'news', 'community']),
    name: z.string().optional(),
    url: z.string().url(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })),
  population: z.number().optional(),
  postalCodes: z.array(z.string()).optional(),
  alternativeNames: z.array(z.string()).optional(),
  overrideReason: z.string().optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

const CityIndexSchema = z.object({
  version: z.string(),
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalCities: z.number().nonnegative(),
  cities: z.array(z.object({
    id: z.string().regex(/^[a-z-]+$/),
    name: z.string(),
    parent: z.string().regex(/^[a-z-]+$/),
    province: z.string(),
    coordinates: z.object({
      lat: z.number().min(50.7).max(53.6),
      lng: z.number().min(3.3).max(7.3)
    }),
    reference: z.string().startsWith('city/'),
    postalCodes: z.array(z.string()).optional(),
    alternativeNames: z.array(z.string()).optional()
  }))
})

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

async function validateGemeenteFile(filePath: string): Promise<{ valid: boolean; incomplete: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let incomplete = false;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    // Validate against schema
    const result = GemeenteSchema.safeParse(data);
    if (!result.success) {
      result.error.errors.forEach(error => {
        // Treat missing/invalid contact, boundaries, parkingRules subfields as incomplete
        const incompleteFields = [
          'contact.website', 'contact.email', 'contact.phone',
          'boundaries',
          'parkingRules.free', 'parkingRules.paid', 'parkingRules.permits', 'parkingRules.restrictions',
          'parkingRules.motorcycleSpecific.dedicatedSpots', 'parkingRules.motorcycleSpecific.allowedOnSidewalk', 'parkingRules.motorcycleSpecific.freeInPaidZones'
        ];
        const pathStr = error.path.join('.');
        if (incompleteFields.includes(pathStr) || error.message.includes('Required') || error.message.includes('Invalid')) {
          incomplete = true;
          warnings.push(`  ${pathStr}: incomplete (${error.message})`);
        } else {
          errors.push(`  ${pathStr}: ${error.message}`);
        }
      });
    }
    // Check for incomplete fields (for fields that are present but null)
    if (result.success) {
      const pr = data.parkingRules;
      if (pr.free === null) { incomplete = true; warnings.push('  parkingRules.free: incomplete (null)'); }
      if (pr.paid.enabled === null) { incomplete = true; warnings.push('  parkingRules.paid.enabled: incomplete (null)'); }
      if (pr.permits.required === null) { incomplete = true; warnings.push('  parkingRules.permits.required: incomplete (null)'); }
      if (pr.motorcycleSpecific.allowedOnSidewalk === null) { incomplete = true; warnings.push('  parkingRules.motorcycleSpecific.allowedOnSidewalk: incomplete (null)'); }
      if (pr.motorcycleSpecific.freeInPaidZones === null) { incomplete = true; warnings.push('  parkingRules.motorcycleSpecific.freeInPaidZones: incomplete (null)'); }
      if (data.lastUpdated === null) { incomplete = true; warnings.push('  lastUpdated: incomplete (null)'); }
      if (!Array.isArray(data.sources) || data.sources.length === 0) { incomplete = true; warnings.push('  sources: incomplete (empty)'); }
      // Check if paid parking has rates when enabled
      if (pr.paid.enabled === true && !pr.paid.rates) {
        errors.push('  Paid parking is enabled but no rates are specified');
      }
      // Check if coordinates are within Netherlands bounds
      if (data.coordinates.lat < 50.7 || data.coordinates.lat > 53.6 || data.coordinates.lng < 3.3 || data.coordinates.lng > 7.3) {
        errors.push('  Coordinates appear to be outside the Netherlands');
      }
      // Check if lastUpdated is not in the future
      if (typeof data.lastUpdated === 'string') {
        const lastUpdated = new Date(data.lastUpdated);
        if (lastUpdated > new Date()) {
          errors.push('  lastUpdated date is in the future');
        }
      }
    }
    return { valid: errors.length === 0, incomplete, errors, warnings };
  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push('  Invalid JSON syntax');
    } else {
      errors.push(`  Error reading file: ${error}`);
    }
    return { valid: false, incomplete, errors, warnings };
  }
}

// --- City data validation function ---
async function validateCityData() {
  console.log('🏙️ Validating city data...')
  
  const cityDir = path.join(process.cwd(), 'data', 'city')
  
  try {
    // Validate city index
    const indexPath = path.join(cityDir, 'index.json')
    if (await fs.access(indexPath).then(() => true).catch(() => false)) {
      const indexContent = await fs.readFile(indexPath, 'utf8')
      const indexData = JSON.parse(indexContent)
      
      const indexResult = CityIndexSchema.safeParse(indexData)
      if (indexResult.success) {
        console.log('✅ city/index.json')
        
        // Validate each referenced city file
        for (const cityRef of indexData.cities) {
          const cityPath = path.join(process.cwd(), 'data', cityRef.reference)
          try {
            const cityContent = await fs.readFile(cityPath, 'utf8')
            const cityData = JSON.parse(cityContent)
            
            const cityResult = CitySchema.safeParse(cityData)
            if (cityResult.success) {
              console.log(`✅ ${cityRef.reference}`)
            } else {
              console.log(`❌ ${cityRef.reference}`)
              cityResult.error.errors.forEach(error => {
                console.log(`   ${error.path.join('.')}: ${error.message}`)
              })
            }
          } catch (error) {
            console.log(`❌ ${cityRef.reference} - File not found or invalid JSON`)
          }
        }
      } else {
        console.log('❌ city/index.json')
        indexResult.error.errors.forEach(error => {
          console.log(`   ${error.path.join('.')}: ${error.message}`)
        })
      }
    } else {
      console.log('ℹ️ No city data found (city/index.json missing)')
    }
  } catch (error) {
    console.log('❌ Failed to validate city data:', error)
  }
}

async function validateAllData() {
  console.log(`${colors.bright}${colors.blue}🔍 Validating gemeente data files...${colors.reset}\n`)
  
  const dataDir = path.join(process.cwd(), 'data', 'gemeentes')
  
  try {
    // Create directory if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true })
    
    const files = await fs.readdir(dataDir)
    const jsonFiles = files.filter((file: string) => file.endsWith('.json'))
    
    if (jsonFiles.length === 0) {
      console.log(`${colors.yellow}⚠️  No JSON files found in ${dataDir}${colors.reset}`)
      console.log(`${colors.yellow}   Create gemeente data files to validate${colors.reset}`)
      return
    }
    
    let totalValid = 0;
    let totalInvalid = 0;
    let totalIncomplete = 0;
    const invalidFiles: string[] = [];
    const incompleteFiles: string[] = [];
    for (const file of jsonFiles) {
      const filePath = path.join(dataDir, file);
      const { valid, incomplete, errors, warnings } = await validateGemeenteFile(filePath);
      if (valid && !incomplete) {
        console.log(`${colors.green}✓ ${file}${colors.reset}`)
        totalValid++
      } else if (valid && incomplete) {
        console.log(`${colors.yellow}~ ${file}${colors.reset}`)
        warnings.forEach(w => console.log(`${colors.yellow}${w}${colors.reset}`))
        totalIncomplete++
        incompleteFiles.push(file)
      } else {
        console.log(`${colors.red}✗ ${file}${colors.reset}`)
        errors.forEach(error => console.log(`${colors.red}${error}${colors.reset}`))
        totalInvalid++
        invalidFiles.push(file)
      }
    }
    
    // Summary
    console.log(`\n${colors.bright}Summary:${colors.reset}`)
    console.log(`Total files: ${jsonFiles.length}`)
    console.log(`${colors.green}Valid: ${totalValid}${colors.reset}`)
    console.log(`${colors.yellow}Incomplete: ${totalIncomplete}${colors.reset}`)
    console.log(`${colors.red}Invalid: ${totalInvalid}${colors.reset}`)
    
    if (invalidFiles.length > 0) {
      console.log(`\n${colors.red}Invalid files:${colors.reset}`)
      invalidFiles.forEach(file => console.log(`  - ${file}`))
      process.exit(1)
    } else if (incompleteFiles.length > 0) {
      console.log(`\n${colors.yellow}Incomplete files:${colors.reset}`)
      incompleteFiles.forEach(file => console.log(`  - ${file}`))
      process.exit(2)
    } else {
      console.log(`\n${colors.green}${colors.bright}✨ All files are valid!${colors.reset}`)
    }
    
  } catch (error) {
    console.error(`${colors.red}Error validating data: ${error}${colors.reset}`)
    process.exit(1)
  }
}

// Run validation
validateAllData().catch(console.error)

// Add this call to your main validateAllData function
export { validateCityData }