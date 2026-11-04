import { describe, expect, it } from 'vitest'
import { findGemeenteByAlias } from './gemeenteAlias'
import { landingSlugs, slugify } from './indexable.js'

describe('slugify', () => {
  it.each([
    ["'s-Gravenhage", 's-gravenhage'],
    ['Katwijk aan Zee', 'katwijk-aan-zee'],
    ['Nieuw-Vennep', 'nieuw-vennep'],
    ['Súdwest-Fryslân', 'sudwest-fryslan'],
  ])('%s becomes %s', (name, slug) => {
    expect(slugify(name)).toBe(slug)
  })
})

describe('landingSlugs', () => {
  const withRules = { lastUpdated: '2026-01-01', alternativeNames: ['Hoofddorp'] }

  it('gives places a page when the gemeente has rules', () => {
    expect(landingSlugs(withRules)).toEqual(['hoofddorp'])
  })

  it('gives no page without rules', () => {
    expect(landingSlugs({ alternativeNames: ['Edam'], sources: [] })).toEqual([])
  })

  it('gives search-only names no page', () => {
    expect(
      landingSlugs({ ...withRules, alternativeNames: [], searchOnlyNames: ['Ypenburg'] })
    ).toEqual([])
  })
})

describe('findGemeenteByAlias', () => {
  it('reads places from the data', async () => {
    const place = await findGemeenteByAlias('hoofddorp')
    expect(place?.gemeente.id).toBe('haarlemmermeer')
    expect(place?.hasLanding).toBe(true)
    expect((await findGemeenteByAlias('ypenburg'))?.hasLanding).toBe(false)
    expect((await findGemeenteByAlias('edam'))?.hasLanding).toBe(false)
    expect(await findGemeenteByAlias('bestaat-niet')).toBeUndefined()
  })
})
