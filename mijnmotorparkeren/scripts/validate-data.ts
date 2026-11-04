// Warnings never fail the run.
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'

const Id = z.string().regex(/^[a-z-]+$/)
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const Province = z.enum([
  'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen',
  'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel',
  'Utrecht', 'Zeeland', 'Zuid-Holland',
])
const Coordinates = z.strictObject({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})
const NlCoordinates = z.strictObject({
  lat: z.number().min(50.7).max(53.6),
  lng: z.number().min(3.3).max(7.3),
})

// Omit unknown facts, never null.
const ParkingRulesSchema = z.strictObject({
  free: z.boolean().optional(),
  paid: z.strictObject({
    enabled: z.boolean().optional(),
    areas: z.array(z.string()).min(1).optional(),
    rates: z.strictObject({
      hourly: z.number(),
      daily: z.number().optional(),
      currency: z.literal('EUR'),
    }).optional(),
  }).optional(),
  permits: z.strictObject({
    required: z.boolean().optional(),
    types: z.array(z.string()).min(1).optional(),
  }).optional(),
  restrictions: z.strictObject({
    timeLimit: z.number().positive().optional(),
    noParking: z.array(z.strictObject({
      location: z.string(),
      days: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).optional(),
      times: z.string().optional(),
    })).min(1).optional(),
  }).optional(),
  motorcycleSpecific: z.strictObject({
    dedicatedSpots: z.array(z.strictObject({
      location: z.string(),
      spots: z.number().positive().optional(),
      coordinates: NlCoordinates.optional(),
    })).min(1).optional(),
    allowedOnSidewalk: z.boolean().optional(),
    freeInPaidZones: z.boolean().optional(),
    notes: z.string().min(1),
  }),
  securityAdvice: z.strictObject({
    recommended: z.array(z.string()).optional(),
    optional: z.array(z.string()).optional(),
    communityNotes: z.string().optional(),
  }).optional(),
})

const SourceSchema = z
  .strictObject({
    type: z.enum(['official', 'regulation', 'news', 'community']).optional(),
    name: z.string().min(1).optional(),
    url: z.url({ protocol: /^https?$/ }).optional(),
    date: IsoDate.optional(),
  })
  .refine((s) => s.name || s.url, 'source needs a name or url')

const GemeenteSchema = z.strictObject({
  id: Id,
  name: z.string().min(1),
  province: Province.optional(),
  alternativeNames: z.array(z.string().min(1)).min(1).optional(),
  searchOnlyNames: z.array(z.string().min(1)).min(1).optional(),
  coordinates: NlCoordinates,
  zoom: z.number().optional(),
  statcode: z.string().optional(),
  parkingRules: ParkingRulesSchema,
  contact: z.strictObject({
    website: z.url().optional(),
    email: z.email().optional(),
    phone: z.string().optional(),
  }).optional(),
  lastUpdated: IsoDate.optional(),
  sources: z.array(SourceSchema).optional(),
})

const CountrySchema = z.strictObject({
  ...GemeenteSchema.shape,
  type: z.literal('country'),
  province: z.string().optional(),
  coordinates: Coordinates,
  // Only countries carry geometry.
  boundaries: z.strictObject({
    type: z.enum(['Polygon', 'MultiPolygon']),
    coordinates: z.array(z.any()).min(1),
  }),
})

const CitySchema = z.strictObject({
  id: Id,
  parent: Id,
  name: z.string().min(1),
  province: Province,
  coordinates: NlCoordinates,
  parkingRules: ParkingRulesSchema,
  area: z.strictObject({
    type: z.literal('FeatureCollection'),
    features: z.array(z.strictObject({
      type: z.literal('Feature'),
      geometry: z.strictObject({
        type: z.enum(['Polygon', 'MultiPolygon']),
        coordinates: z.array(z.any()).min(1),
      }),
      properties: z.record(z.string(), z.unknown()).optional(),
    })).min(1),
  }),
  lastUpdated: IsoDate,
  sources: z.array(SourceSchema),
  population: z.number().optional(),
  postalCodes: z.array(z.string()).optional(),
  alternativeNames: z.array(z.string()).optional(),
  overrideReason: z.string().optional(),
  effectiveDate: IsoDate.optional(),
})

const StubCitySchema = z.strictObject({
  id: Id,
  name: z.string().min(1),
  municipality: Id,
  province: Province,
  coordinates: z.null(),
  lastUpdated: IsoDate,
})

const PoiIndexSchema = z.strictObject({
  pois: z.array(z.strictObject({
    municipalityId: Id,
    scope: z.enum(['gemeente', 'city']).optional(),
  })),
})

const PoiFileSchema = z.strictObject({
  id: z.string(),
  municipalityId: Id,
  pois: z.array(z.strictObject({
    id: z.string().min(1),
    type: z.enum(['freeStreetParking', 'dedicatedMotorcycleSpot']),
    name: z.string().min(1),
    description: z.string().optional(),
    coordinates: NlCoordinates,
    address: z.string().optional(),
    capacity: z.number().optional(),
    source: z.strictObject({
      type: z.enum(['official', 'community', 'reddit']),
      url: z.string().optional(),
      date: IsoDate.optional(),
    }).optional(),
  })).min(1),
})

export interface ValidationReport {
  files: number
  errors: string[]
  /** Warning kind to files. */
  warnings: Record<string, string[]>
}

async function listJson(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir).catch(() => [] as string[])
  return entries.filter((f) => f.endsWith('.json') && f !== 'index.json').sort()
}

export async function validateData(root: string): Promise<ValidationReport> {
  const report: ValidationReport = { files: 0, errors: [], warnings: {} }
  const warn = (kind: string, file: string) => (report.warnings[kind] ??= []).push(file)

  const read = async (rel: string): Promise<unknown> => {
    report.files++
    try {
      return JSON.parse(await fs.readFile(path.join(root, rel), 'utf-8'))
    } catch (err) {
      report.errors.push(`${rel}: ${err instanceof SyntaxError ? 'invalid JSON' : String(err)}`)
      return undefined
    }
  }

  const check = <T>(rel: string, schema: z.ZodType<T>, data: unknown): T | undefined => {
    const result = schema.safeParse(data)
    if (result.success) return result.data
    for (const issue of result.error.issues) {
      report.errors.push(`${rel}: ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    }
    return undefined
  }

  const checkCommon = (
    rel: string,
    file: string,
    d: {
      id: string
      lastUpdated?: string
      parkingRules: z.infer<typeof ParkingRulesSchema>
    }
  ) => {
    if (d.id !== file.slice(0, -'.json'.length)) {
      report.errors.push(`${rel}: id "${d.id}" does not match filename`)
    }
    if (d.lastUpdated && new Date(d.lastUpdated) > new Date()) {
      report.errors.push(`${rel}: lastUpdated is in the future`)
    }
    if (d.parkingRules.paid?.enabled && !d.parkingRules.paid.rates) warn('paid parking without rates', rel)
  }

  // Name or alias to its files
  const namesInUse = new Map<string, Set<string>>()
  const trackNames = (
    rel: string,
    d: { name: string; alternativeNames?: string[]; searchOnlyNames?: string[] }
  ) => {
    for (const name of [d.name, ...(d.alternativeNames ?? []), ...(d.searchOnlyNames ?? [])]) {
      const key = name.toLowerCase().replace(/^gemeente\s+/, '').trim()
      if (!namesInUse.has(key)) namesInUse.set(key, new Set())
      namesInUse.get(key)!.add(rel)
    }
  }
  const statcodes: Array<[string, string]> = []

  // Gemeentes and countries
  const gemeenteFiles = await listJson(path.join(root, 'gemeentes'))
  const gemeenteIds = new Set(gemeenteFiles.map((f) => f.slice(0, -'.json'.length)))
  for (const file of gemeenteFiles) {
    const rel = `gemeentes/${file}`
    const raw = await read(rel)
    if (raw === undefined) continue
    const isCountry = (raw as { type?: unknown } | null)?.type === 'country'
    const d = isCountry ? check(rel, CountrySchema, raw) : check(rel, GemeenteSchema, raw)
    if (!d) continue
    checkCommon(rel, file, d)
    trackNames(rel, d)
    if (d.statcode) statcodes.push([rel, d.statcode])
    if (isCountry) continue
    if (!d.province) warn('gemeente without province', rel)
    if (!d.lastUpdated && !d.sources?.length) warn('no researched rules yet', rel)
  }

  // Cities
  const cityFiles = await listJson(path.join(root, 'city'))
  const cityIds = new Set(cityFiles.map((f) => f.slice(0, -'.json'.length)))
  for (const file of cityFiles) {
    const rel = `city/${file}`
    const raw = await read(rel)
    if (raw === undefined) continue
    if (raw && typeof raw === 'object' && 'municipality' in raw) {
      if (check(rel, StubCitySchema, raw)) warn('stub city without rules or area', rel)
      continue
    }
    const d = check(rel, CitySchema, raw)
    if (!d) continue
    checkCommon(rel, file, d)
    trackNames(rel, d)
    if (!gemeenteIds.has(d.parent)) report.errors.push(`${rel}: parent "${d.parent}" has no gemeente file`)
  }

  // Same place can exist twice
  for (const [name, files] of namesInUse) {
    if (files.size > 1) warn('name shared between areas', `${name} (${[...files].join(', ')})`)
  }

  // Wrong statcode loses the shape
  if (statcodes.length > 0) {
    const shapes = (await read('gemeente_2026.geojson')) as
      | { features?: Array<{ properties?: { statcode?: string } }> }
      | undefined
    if (shapes) {
      const known = new Set(shapes.features?.map((f) => f.properties?.statcode))
      for (const [rel, code] of statcodes) {
        if (!known.has(code)) report.errors.push(`${rel}: statcode "${code}" has no map shape`)
      }
    }
  }

  // POI index must match files.
  const poiKey = (id: string, scope: string) => `${scope}:${id}`
  const onDisk = new Set<string>()
  for (const [scope, dir, known] of [
    ['gemeente', 'poi', gemeenteIds],
    ['city', 'poi/city', cityIds],
  ] as const) {
    for (const file of await listJson(path.join(root, dir))) {
      const rel = `${dir}/${file}`
      const id = file.slice(0, -'.json'.length)
      onDisk.add(poiKey(id, scope))
      const d = check(rel, PoiFileSchema, await read(rel))
      if (!d) continue
      if (d.municipalityId !== id) report.errors.push(`${rel}: municipalityId does not match filename`)
      if (!known.has(id)) report.errors.push(`${rel}: no ${scope} file named "${id}"`)
    }
  }
  const poiIndex = check('poi/index.json', PoiIndexSchema, await read('poi/index.json'))
  if (poiIndex) {
    const indexed = new Set(poiIndex.pois.map((p) => poiKey(p.municipalityId, p.scope ?? 'gemeente')))
    for (const key of indexed) {
      if (!onDisk.has(key)) report.errors.push(`poi/index.json: "${key}" has no POI file`)
    }
    for (const key of onDisk) {
      if (!indexed.has(key)) report.errors.push(`poi/index.json: POI file "${key}" is not indexed`)
    }
  }

  return report
}

async function main() {
  const report = await validateData(path.join(process.cwd(), 'data'))
  for (const [kind, files] of Object.entries(report.warnings).sort()) {
    const shown = files.slice(0, 5).join(', ')
    console.log(`warning: ${kind}: ${files.length} (${shown}${files.length > 5 ? ', ...' : ''})`)
  }
  for (const error of report.errors) console.error(`error: ${error}`)
  console.log(`${report.files} files checked, ${report.errors.length} errors`)
  if (report.errors.length > 0) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
