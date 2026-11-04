// One-off; delete after merge.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { getParkingStatus, hasDedicatedMotorcycleSpots } from '../src/utils/gemeenteUtils'
import type { Gemeente } from '../src/types/gemeente'
import { validateData } from './validate-data'

type Json = Record<string, unknown>

/** Drops nulls and empty containers. */
export function prune(value: unknown): unknown {
  if (value === null) return undefined
  if (Array.isArray(value)) {
    const items = value.map(prune).filter((v) => v !== undefined)
    return items.length > 0 ? items : undefined
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Json)
      .map(([k, v]) => [k, prune(v)] as const)
      .filter(([, v]) => v !== undefined)
    return entries.length > 0 ? Object.fromEntries(entries) : undefined
  }
  return value
}

const SOURCE_TYPES = ['official', 'regulation', 'news', 'community']

/** Normalizes legacy source shapes. */
export function migrateSources(sources: unknown[]): Json[] {
  return sources.flatMap((source) => {
    if (typeof source === 'string') return [{ name: source }]
    const s = { ...(source as Json) }
    if (s.url === '#' || s.url === '') delete s.url
    if (!SOURCE_TYPES.includes(s.type as string)) delete s.type
    return s.name || s.url ? [s] : []
  })
}

export function migrateEntity(before: Json): Json {
  const after = structuredClone(before)
  if (after.type !== 'country') {
    delete after.boundaries
    delete after.geometry
  }
  if (after.lastUpdated === null) delete after.lastUpdated
  if (Array.isArray(after.sources)) after.sources = migrateSources(after.sources)
  const rules = after.parkingRules as Json | undefined
  if (rules) {
    delete rules.contact
    after.parkingRules = prune(rules)
  }
  return after
}

/** Lists values, independent of prune. */
function leaves(value: unknown, at = ''): string[] {
  if (value === null || value === undefined) return []
  if (typeof value !== 'object') return [`${at}=${JSON.stringify(value)}`]
  return Object.entries(value).flatMap(([k, v]) => leaves(v, `${at}/${k}`))
}

/** Throws on unintended data loss. */
export function verifyEntity(before: Json, after: Json): void {
  const { contact: _contact, ...rulesBefore } = (before.parkingRules ?? {}) as Json
  assert.deepEqual(leaves(after.parkingRules).sort(), leaves(rulesBefore).sort(), 'parking rules changed')

  const rest = (d: Json) => {
    const { parkingRules: _rules, sources: _sources, ...others } = d
    if (others.lastUpdated === null) delete others.lastUpdated
    if (others.type !== 'country') {
      delete others.boundaries
      delete others.geometry
    }
    // isThinData needs the key.
    return { ...others, hasSources: 'sources' in d }
  }
  assert.deepEqual(rest(after), rest(before), 'fields outside parkingRules changed')

  // Citations must survive.
  const cited = (d: Json) =>
    ((d.sources ?? []) as unknown[])
      .map((s) => (typeof s === 'string' ? { name: s } : (s as Json)))
      .filter((s) => s.name || (s.url && s.url !== '#'))
      .map((s) => [s.name, s.url === '#' || s.url === '' ? undefined : s.url, s.date])
  assert.deepEqual(cited(after), cited(before), 'sources changed')

  const view = (d: Json) => d as unknown as Gemeente
  assert.equal(getParkingStatus(view(after)).status, getParkingStatus(view(before)).status, 'status changed')
  assert.equal(hasDedicatedMotorcycleSpots(view(after)), hasDedicatedMotorcycleSpots(view(before)), 'spots changed')
}

export function migratePoiIndex(before: { pois: Array<{ municipalityId: string; scope?: string }> }) {
  const seen = new Map<string, { municipalityId: string; scope?: string }>()
  for (const { municipalityId, scope } of before.pois) {
    seen.set(`${scope ?? 'gemeente'}:${municipalityId}`, { municipalityId, ...(scope ? { scope } : {}) })
  }
  return { pois: [...seen.values()] }
}

export function serialize(data: Json): string {
  // Minify large country polygons.
  return data.type === 'country' ? `${JSON.stringify(data)}\n` : `${JSON.stringify(data, null, 2)}\n`
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const dataDir = path.join(process.cwd(), 'data')
  const changes = new Map<string, string>()
  let sizeBefore = 0
  let sizeAfter = 0

  const convert = async (rel: string, run: (before: Json) => Json) => {
    const text = await fs.readFile(path.join(dataDir, rel), 'utf-8')
    const output = run(JSON.parse(text) as Json)
    const next = serialize(output)
    sizeBefore += text.length
    sizeAfter += next.length
    if (next !== text) changes.set(rel, next)
  }

  for (const dir of ['gemeentes', 'city']) {
    for (const file of (await fs.readdir(path.join(dataDir, dir))).filter((f) => f.endsWith('.json'))) {
      await convert(`${dir}/${file}`, (before) => {
        const after = migrateEntity(before)
        try {
          verifyEntity(before, after)
        } catch (err) {
          throw new Error(`${dir}/${file}: ${(err as Error).message}`, { cause: err })
        }
        return after
      })
    }
  }
  await convert('poi/index.json', (before) =>
    migratePoiIndex(before as unknown as Parameters<typeof migratePoiIndex>[0])
  )

  // Failure leaves data/ untouched.
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'migrate-data-'))
  try {
    await fs.cp(dataDir, tmp, { recursive: true })
    for (const [rel, text] of changes) await fs.writeFile(path.join(tmp, rel), text)
    const report = await validateData(tmp)
    for (const error of report.errors) console.error(`error: ${error}`)
    if (report.errors.length > 0) {
      console.error(`Validation failed with ${report.errors.length} errors. data/ was not changed.`)
      process.exit(1)
    }
    console.log(`Verified ${report.files} files, ${changes.size} to change.`)
    console.log(`Size: ${sizeBefore} -> ${sizeAfter} bytes`)
  } finally {
    await fs.rm(tmp, { recursive: true, force: true })
  }

  if (dryRun) {
    console.log('Dry run: data/ was not changed.')
    return
  }
  for (const [rel, text] of changes) await fs.writeFile(path.join(dataDir, rel), text)
  console.log(`Wrote ${changes.size} files.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
