import { describe, expect, it } from 'vitest'
import { clampPercent, percentFromPointer } from './curtain'

describe('curtain', () => {
  it('clamps to 0-100 and falls back to 50 for NaN', () => {
    expect(clampPercent(-10)).toBe(0)
    expect(clampPercent(140)).toBe(100)
    expect(clampPercent(NaN)).toBe(50)
    expect(clampPercent(33)).toBe(33)
  })

  it('converts a pointer position to a percent of the box', () => {
    expect(percentFromPointer(150, 100, 200)).toBe(25)
    expect(percentFromPointer(0, 100, 200)).toBe(0)
    expect(percentFromPointer(500, 100, 200)).toBe(100)
    expect(percentFromPointer(150, 100, 0)).toBe(50)
  })
})
