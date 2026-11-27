import { describe, expect, it } from 'vitest'
import { formatDateCompact } from './locale'

describe('formatDateCompact', () => {
  const today = new Date(2026, 10, 27)

  it('omits the year when it is the current year', () => {
    expect(formatDateCompact('2026-10-12', today)).toBe('12 oct.')
    expect(formatDateCompact('2026-11-27', today)).toBe('27 nov.')
  })

  it('includes the year otherwise', () => {
    expect(formatDateCompact('2025-10-12', today)).toBe('12 oct. 2025')
  })
})
