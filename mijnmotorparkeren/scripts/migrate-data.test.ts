import { describe, expect, it } from 'vitest'
import {
  migrateEntity,
  migratePoiIndex,
  migrateSources,
  prune,
  serialize,
  verifyEntity,
} from './migrate-data'

const legacy = () => ({
  id: 'aalten',
  boundaries: { type: 'Polygon', coordinates: [[[6, 51]]] },
  coordinates: { lat: 51.9, lng: 6.5 },
  lastUpdated: null,
  sources: [],
  parkingRules: {
    free: false,
    contact: null,
    paid: { enabled: null, areas: [], rates: {} },
    permits: { required: null, types: [] },
    restrictions: { timeLimit: null, noParking: [] },
    motorcycleSpecific: {
      dedicatedSpots: [{ location: 'A', spots: null }],
      allowedOnSidewalk: false,
      freeInPaidZones: null,
      notes: 'x',
    },
  },
})

describe('migrateEntity', () => {
  it('keeps real values, including false, and keeps empty sources', () => {
    expect(migrateEntity(legacy())).toEqual({
      id: 'aalten',
      coordinates: { lat: 51.9, lng: 6.5 },
      sources: [],
      parkingRules: {
        free: false,
        motorcycleSpecific: {
          dedicatedSpots: [{ location: 'A' }],
          allowedOnSidewalk: false,
          notes: 'x',
        },
      },
    })
  })

  it('leaves its own output unchanged', () => {
    const once = migrateEntity(legacy())
    expect(migrateEntity(once)).toEqual(once)
  })

  it('keeps boundaries on countries and minifies them', () => {
    const country = { ...legacy(), type: 'country' }
    const after = migrateEntity(country)
    expect(after.boundaries).toEqual(country.boundaries)
    expect(serialize(after)).not.toContain('\n  ')
  })

  it('leaves stub cities without rules untouched', () => {
    const stub = { id: 'x', municipality: 'y', coordinates: null, lastUpdated: '2025-07-10' }
    expect(migrateEntity(stub)).toEqual(stub)
  })
})

describe('migrateSources', () => {
  it('normalizes strings, placeholders and unknown types', () => {
    expect(
      migrateSources([
        'Medewerker',
        { name: 'A', url: '#', type: 'official', date: '2025-01-01' },
        { name: 'B', url: 'https://b.nl', type: 'un' },
        { type: 'un', date: '2025-09-26' },
      ])
    ).toEqual([
      { name: 'Medewerker' },
      { name: 'A', type: 'official', date: '2025-01-01' },
      { name: 'B', url: 'https://b.nl' },
    ])
  })

  it('is caught by verifyEntity when a citation is lost', () => {
    const before = { ...legacy(), sources: [{ name: 'A', url: 'https://a.nl' }] }
    const after = { ...migrateEntity(before), sources: [{ name: 'A' }] }
    expect(() => verifyEntity(before, after)).toThrow('sources changed')
  })
})

describe('prune', () => {
  it('keeps zero and false, drops empty containers', () => {
    expect(prune({ a: 0, b: false, c: {}, d: [null], e: { f: null } })).toEqual({ a: 0, b: false })
  })
})

describe('verifyEntity', () => {
  it('accepts a correct conversion', () => {
    expect(() => verifyEntity(legacy(), migrateEntity(legacy()))).not.toThrow()
  })

  it('catches a lost rule value', () => {
    const after = migrateEntity(legacy()) as { parkingRules: { free?: boolean } }
    delete after.parkingRules.free
    expect(() => verifyEntity(legacy(), after)).toThrow('parking rules changed')
  })

  it('catches a lost field outside the rules', () => {
    const after = migrateEntity(legacy())
    delete after.sources
    expect(() => verifyEntity(legacy(), after)).toThrow('fields outside parkingRules changed')
  })

  it('catches a changed parking status', () => {
    const before = legacy()
    before.parkingRules.motorcycleSpecific.allowedOnSidewalk = true
    const after = migrateEntity(legacy())
    expect(() => verifyEntity(before, after)).toThrow()
  })
})

describe('migratePoiIndex', () => {
  it('keeps one entry per municipality and scope', () => {
    expect(
      migratePoiIndex({
        pois: [
          { municipalityId: 'amsterdam' },
          { municipalityId: 'amsterdam' },
          { municipalityId: 'schiphol', scope: 'city' },
        ],
      })
    ).toEqual({ pois: [{ municipalityId: 'amsterdam' }, { municipalityId: 'schiphol', scope: 'city' }] })
  })
})
