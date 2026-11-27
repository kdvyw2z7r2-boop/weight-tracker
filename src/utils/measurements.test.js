import { describe, expect, it } from 'vitest'
import {
  MEASUREMENT_ZONES,
  formatCm,
  formatCmDelta,
  listMeasurements,
  measurementProgress,
  seriesForZone,
} from './measurements'

const m = (id, date, values, updatedAt = 1) => ({ id, date, ...values, updatedAt })

describe('MEASUREMENT_ZONES', () => {
  it('6 zones dans l’ordre du spec', () => {
    expect(MEASUREMENT_ZONES.map((z) => z.key)).toEqual(['waist', 'hips', 'chest', 'arm', 'thigh', 'neck'])
    expect(MEASUREMENT_ZONES[0].label).toBe('Taille')
  })
})

describe('listMeasurements', () => {
  it('chronologique, ignore les relevés invalides ou sans valeur', () => {
    const map = {
      b: m('b', '2026-11-10', { waist: 90 }),
      a: m('a', '2026-11-01', { waist: 92 }),
      bad: { id: 'bad', date: '2026-11-05' },
      x: null,
    }
    expect(listMeasurements(map).map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('map absente → liste vide', () => {
    expect(listMeasurements(undefined)).toEqual([])
  })
})

describe('measurementProgress', () => {
  it('liste vide → totalDelta null', () => {
    expect(measurementProgress([], null)).toEqual({ byZone: {}, totalDelta: null, from: null, to: null })
  })

  it('relevés partiels : taille seule au départ, taille + hanches ensuite → total = delta taille', () => {
    const list = [m('a', '2026-11-01', { waist: 95 }), m('b', '2026-11-20', { waist: 91.5, hips: 104 })]
    const progress = measurementProgress(list, null)
    expect(progress.byZone.waist).toEqual({ start: 95, latest: 91.5, delta: -3.5 })
    expect(progress.byZone.hips).toEqual({ start: 104, latest: 104, delta: null })
    expect(progress.totalDelta).toBe(-3.5)
    expect(progress.from).toBe('2026-11-01')
    expect(progress.to).toBe('2026-11-20')
  })

  it('départ du défi postérieur au premier relevé : on part du 1er relevé à partir du défi', () => {
    const list = [
      m('a', '2026-10-01', { waist: 100, hips: 110 }),
      m('b', '2026-11-01', { waist: 96, hips: 107 }),
      m('c', '2026-11-25', { waist: 93, hips: 104.5 }),
    ]
    const progress = measurementProgress(list, '2026-10-15')
    expect(progress.byZone.waist.delta).toBe(-3)
    expect(progress.byZone.hips.delta).toBe(-2.5)
    expect(progress.totalDelta).toBe(-5.5)
    expect(progress.from).toBe('2026-11-01')
  })

  it('aucun relevé depuis le défi → repli sur le premier relevé', () => {
    const list = [m('a', '2026-10-01', { waist: 100 }), m('b', '2026-10-10', { waist: 98 })]
    const progress = measurementProgress(list, '2026-11-15')
    expect(progress.byZone.waist.delta).toBe(-2)
  })

  it('un seul relevé → totalDelta null', () => {
    expect(measurementProgress([m('a', '2026-11-01', { waist: 90 })], null).totalDelta).toBeNull()
  })
})

describe('seriesForZone', () => {
  it('points chronologiques de la zone seulement', () => {
    const list = [m('a', '2026-11-01', { waist: 95 }), m('b', '2026-11-08', { hips: 100 }), m('c', '2026-11-15', { waist: 94 })]
    expect(seriesForZone(list, 'waist')).toEqual([
      { date: '2026-11-01', value: 95 },
      { date: '2026-11-15', value: 94 },
    ])
  })
})

describe('format', () => {
  it('cm à 1 décimale avec virgule, delta signé', () => {
    expect(formatCm(82.5)).toBe('82,5\u00a0cm')
    expect(formatCmDelta(-6.5)).toBe('−6,5\u00a0cm')
    expect(formatCmDelta(1)).toBe('+1,0\u00a0cm')
    expect(formatCmDelta(null)).toBe('—')
  })
})
