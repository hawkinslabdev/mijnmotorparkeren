import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { validateData } from './validate-data'

const gemeente = (over: object = {}) => ({
  id: 'aalten',
  name: 'Gemeente Aalten',
  province: 'Gelderland',
  coordinates: { lat: 51.9, lng: 6.5 },
  parkingRules: { motorcycleSpecific: { notes: 'Geen gegevens' } },
  sources: [],
  ...over,
})

describe('validateData', () => {
  let root: string

  const write = async (rel: string, data: unknown) => {
    await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true })
    await fs.writeFile(path.join(root, rel), JSON.stringify(data))
  }

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'validate-data-'))
    await write('gemeentes/aalten.json', gemeente())
    await write('poi/index.json', { pois: [] })
  })

  afterEach(() => fs.rm(root, { recursive: true, force: true }))

  it('passes the repository data', async () => {
    const { errors, files } = await validateData(path.join(process.cwd(), 'data'))
    expect(errors).toEqual([])
    expect(files).toBeGreaterThan(350)
  })

  it('accepts a gemeente without researched rules and only warns', async () => {
    const report = await validateData(root)
    expect(report.errors).toEqual([])
    expect(report.warnings['no researched rules yet']).toEqual(['gemeentes/aalten.json'])
  })

  it.each([
    ['retired boundaries', { boundaries: { type: 'Polygon', coordinates: [[]] } }],
    ['null rule', { parkingRules: { free: null, motorcycleSpecific: { notes: 'x' } } }],
    ['missing notes', { parkingRules: { motorcycleSpecific: {} } }],
    ['id not matching filename', { id: 'other' }],
    ['future lastUpdated', { lastUpdated: '2999-01-01' }],
    ['plain string source', { sources: ['Medewerker'] }],
    ['placeholder source url', { sources: [{ name: 'A', url: '#' }] }],
    ['unknown source type', { sources: [{ name: 'A', type: 'un' }] }],
    ['source naming nothing', { sources: [{ date: '2025-01-01' }] }],
  ])('rejects %s', async (_name, over) => {
    await write('gemeentes/aalten.json', gemeente(over))
    expect((await validateData(root)).errors).toHaveLength(1)
  })

  it('reports invalid JSON', async () => {
    await fs.writeFile(path.join(root, 'gemeentes/aalten.json'), '{ nope')
    expect((await validateData(root)).errors).toEqual(['gemeentes/aalten.json: invalid JSON'])
  })

  it('lets countries keep boundaries outside the Netherlands', async () => {
    await write('gemeentes/belgie.json', {
      ...gemeente({ id: 'belgie', name: 'België', province: 'België' }),
      type: 'country',
      coordinates: { lat: 50.5, lng: 3 },
      boundaries: { type: 'MultiPolygon', coordinates: [[[[3, 50]]]] },
    })
    expect((await validateData(root)).errors).toEqual([])
  })

  it('rejects a country without boundaries', async () => {
    await write('gemeentes/belgie.json', gemeente({ id: 'belgie', type: 'country' }))
    expect((await validateData(root)).errors).toHaveLength(1)
  })

  it('rejects a city whose parent has no gemeente file', async () => {
    await write('city/oost.json', {
      id: 'oost',
      parent: 'missing',
      name: 'Oost',
      province: 'Gelderland',
      coordinates: { lat: 51.9, lng: 6.5 },
      parkingRules: { motorcycleSpecific: { notes: 'x' } },
      area: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } }],
      },
      lastUpdated: '2025-01-01',
      sources: [],
    })
    expect((await validateData(root)).errors).toEqual([
      'city/oost.json: parent "missing" has no gemeente file',
    ])
  })

  it('warns when an alias matches another area', async () => {
    await write('gemeentes/aalten.json', gemeente({ alternativeNames: ['Bredevoort'] }))
    await write(
      'gemeentes/winterswijk.json',
      gemeente({ id: 'winterswijk', name: 'Gemeente Winterswijk', alternativeNames: ['bredevoort'] })
    )
    const report = await validateData(root)
    expect(report.errors).toEqual([])
    expect(report.warnings['name shared between areas']).toEqual([
      'bredevoort (gemeentes/aalten.json, gemeentes/winterswijk.json)',
    ])
  })

  it('does not warn when an area repeats its own name', async () => {
    await write('gemeentes/aalten.json', gemeente({ alternativeNames: ['Aalten'] }))
    expect((await validateData(root)).warnings['name shared between areas']).toBeUndefined()
  })

  it('rejects a statcode without a map shape', async () => {
    await write('gemeente_2026.geojson', {
      features: [{ properties: { statcode: 'GM0001' } }],
    })
    await write('gemeentes/aalten.json', gemeente({ statcode: 'GM9999' }))
    expect((await validateData(root)).errors).toEqual([
      'gemeentes/aalten.json: statcode "GM9999" has no map shape',
    ])

    await write('gemeentes/aalten.json', gemeente({ statcode: 'GM0001' }))
    expect((await validateData(root)).errors).toEqual([])
  })

  it('rejects a POI index that disagrees with the POI files', async () => {
    await write('poi/index.json', { pois: [{ municipalityId: 'aalten' }] })
    expect((await validateData(root)).errors).toEqual([
      'poi/index.json: "gemeente:aalten" has no POI file',
    ])

    await write('poi/index.json', { pois: [] })
    await write('poi/aalten.json', {
      id: 'aalten-pois',
      municipalityId: 'aalten',
      pois: [
        { id: 'a', type: 'freeStreetParking', name: 'A', coordinates: { lat: 51.9, lng: 6.5 } },
      ],
    })
    expect((await validateData(root)).errors).toEqual([
      'poi/index.json: POI file "gemeente:aalten" is not indexed',
    ])
  })
})
