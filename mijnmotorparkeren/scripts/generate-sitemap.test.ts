import { describe, expect, it } from 'vitest'
import { isThinCity, isThinGemeente } from '../src/utils/indexable.js'
import { generateSitemap, getLastmod } from './generate-sitemap.js'

describe('getLastmod', () => {
  it('prefers lastUpdated, then newest source date', () => {
    const sources = [{ date: '2025-01-16' }, { date: '2025-07-08' }, {}]
    expect(getLastmod({ lastUpdated: '2026-01-01', sources })).toBe('2026-01-01')
    expect(getLastmod({ sources })).toBe('2025-07-08')
    expect(getLastmod({ sources: [] })).toBeUndefined()
    expect(getLastmod({})).toBeUndefined()
  })
})

describe('thin page rules', () => {
  it('treats gemeentes without research as thin', () => {
    expect(isThinGemeente({})).toBe(true)
    expect(isThinGemeente({ sources: [] })).toBe(true)
    expect(isThinGemeente({ lastUpdated: '2025-05-28', sources: [] })).toBe(false)
    expect(isThinGemeente({ sources: [{ name: 'A' }] })).toBe(false)
  })

  it('keeps unsourced gemeentes with real notes', () => {
    const withNotes = (notes: string) => ({ parkingRules: { motorcycleSpecific: { notes } } })
    expect(isThinGemeente(withNotes('Op de stoep mag.'))).toBe(false)
    expect(
      isThinGemeente(
        withNotes('Er zijn geen gegevens over parkeerregels beschikbaar voor deze gemeente.')
      )
    ).toBe(true)
  })

  it('treats cities without rules as thin', () => {
    expect(isThinCity({})).toBe(true)
    expect(isThinCity({ parkingRules: {} })).toBe(false)
  })
})

describe('generateSitemap', () => {
  it('uses known lastmod, else the fallback', () => {
    const xml = generateSitemap({
      baseUrl: 'https://example.nl',
      routes: ['/', '/gemeente/texel'],
      lastmods: { '/gemeente/texel': '2025-05-28' },
    })
    expect(xml).toContain('<lastmod>2025-05-28</lastmod>')
    expect(xml).toContain('<lastmod>2026-09-11</lastmod>')
    expect(xml.match(/<lastmod>/g)).toHaveLength(2)
  })
})
