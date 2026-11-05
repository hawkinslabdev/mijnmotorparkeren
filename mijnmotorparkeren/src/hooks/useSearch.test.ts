import { describe, expect, it } from 'vitest'
import { sortExactFirst, type SearchItem } from './useSearch'

const item = (name: string, alternativeNames?: string[]) =>
  ({ name, alternativeNames }) as SearchItem

const epe = item('Gemeente Epe', ['Vaassen'])
const zaanstad = item('Gemeente Zaanstad', ['Assendelft'])
const assen = item('Gemeente Assen')

describe('sortExactFirst', () => {
  it('puts exact gemeente name above partial alias matches', () => {
    expect(sortExactFirst([epe, zaanstad, assen], 'assen')).toEqual([assen, epe, zaanstad])
    expect(sortExactFirst([epe, zaanstad, assen], ' Gemeente ASSEN ')[0]).toBe(assen)
  })

  it('puts exact alias above partial matches', () => {
    expect(sortExactFirst([assen, epe], 'vaassen')).toEqual([epe, assen])
  })

  it('ranks exact name above exact alias', () => {
    const city = item('Vaassen')
    expect(sortExactFirst([epe, city], 'vaassen')).toEqual([city, epe])
  })

  it('keeps fuzzy order without exact match', () => {
    expect(sortExactFirst([epe, zaanstad, assen], 'ass')).toEqual([epe, zaanstad, assen])
  })
})
