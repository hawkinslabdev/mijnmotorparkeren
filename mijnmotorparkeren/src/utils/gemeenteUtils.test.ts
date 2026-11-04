import { describe, expect, it } from 'vitest'
import { getParkingStatus, withoutGemeentePrefix } from './gemeenteUtils'
import type { Gemeente } from '../types/gemeente'

const status = (parkingRules: unknown) =>
  getParkingStatus({ id: 'x', name: 'X', parkingRules } as unknown as Gemeente).status

describe('getParkingStatus', () => {
  it('marks no sidewalk parking as box only', () => {
    expect(status({ motorcycleSpecific: { allowedOnSidewalk: false, notes: 'n' } })).toBe(
      'paid_parking'
    )
  })

  it('marks free in the box as free, even without sidewalk', () => {
    expect(
      status({ free: true, motorcycleSpecific: { allowedOnSidewalk: false, notes: 'n' } })
    ).toBe('free_parking')
  })

  it('marks sidewalk parking', () => {
    expect(status({ motorcycleSpecific: { allowedOnSidewalk: true, notes: 'n' } })).toBe(
      'sidewalk_allowed'
    )
  })

  it('keeps unknown rules as no info', () => {
    expect(status({ motorcycleSpecific: { notes: 'n' } })).toBe('no_info')
    expect(status(undefined)).toBe('no_info')
  })
})

describe('withoutGemeentePrefix', () => {
  it.each([
    ['Gemeente Den Haag', 'Den Haag'],
    ['gemeente Ede', 'Ede'],
    ['Weesp (Gemeente Amsterdam)', 'Weesp (Gemeente Amsterdam)'],
    ['Duitsland', 'Duitsland'],
  ])('%s becomes %s', (name, expected) => {
    expect(withoutGemeentePrefix(name)).toBe(expected)
  })
})
