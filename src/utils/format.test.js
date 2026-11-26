import { describe, expect, it } from 'vitest'
import { formatPace, formatWeight, formatWeightWithUnit } from './format'
import { convertSettingsUnit } from './units'
import { getPaceRange } from './weightPlan'

describe('format', () => {
  it('formats weights with one decimal and a comma in both units', () => {
    expect(formatWeight(83)).toBe('83,0')
    expect(formatWeight(181.5)).toBe('181,5')
    expect(formatWeight(null)).toBe('—')
    expect(formatWeight(NaN)).toBe('—')
  })

  it('appends the unit with a non-breaking space', () => {
    expect(formatWeightWithUnit(87.8, 'kg')).toBe('87,8 kg')
    expect(formatWeightWithUnit(undefined, 'kg')).toBe('—')
  })

  it('formats pace with two decimals and the unit', () => {
    expect(formatPace(0.4)).toBe('0,40 kg/sem.')
    expect(formatPace(0.4, 'lbs')).toBe('0,40 lbs/sem.')
    expect(formatPace(null, 'lbs')).toBe('—')
  })
})

describe('convertSettingsUnit', () => {
  const base = {
    unit: 'kg',
    targetWeight: 75,
    planStartWeight: 83.4,
    challengeStartWeight: 90.15,
    weeklyPace: 0.4,
    height: 180,
  }

  it('round-trips kg -> lbs -> kg within 0.01', () => {
    const lbs = convertSettingsUnit(base, 'lbs')
    expect(lbs.unit).toBe('lbs')
    expect(lbs.weeklyPace).toBeCloseTo(0.88, 2)
    const back = convertSettingsUnit(lbs, 'kg')
    for (const key of ['targetWeight', 'planStartWeight', 'challengeStartWeight', 'weeklyPace']) {
      expect(Math.abs(back[key] - base[key])).toBeLessThanOrEqual(0.01)
    }
    expect(back.height).toBe(180)
  })

  it('is null-safe and a no-op for the same unit', () => {
    const sparse = { unit: 'kg', targetWeight: null, weeklyPace: null }
    expect(convertSettingsUnit(sparse, 'lbs')).toMatchObject({ unit: 'lbs', targetWeight: null, weeklyPace: null })
    expect(convertSettingsUnit(base, 'kg')).toBe(base)
  })
})

describe('getPaceRange', () => {
  it.each(['kg', 'lbs'])('keeps default and max on the slider grid (%s)', (unit) => {
    const { min, max, step, defaultPace } = getPaceRange(unit)
    for (const value of [defaultPace, max]) {
      const steps = (value - min) / step
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9)
    }
  })
})
