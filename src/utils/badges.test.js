import { describe, expect, it } from 'vitest'
import { BADGES, computeBadges, formatBadgeProgress, longestStreak, newlyEarned } from './badges'

// Pesées au format useSync (date DESC).
const entries = (list) =>
  list.map(([date, weight], i) => ({ id: `e${i}`, date, weight, note: '', createdAt: i })).sort((a, b) => (a.date < b.date ? 1 : -1))

const byId = (badges) => Object.fromEntries(badges.map((badge) => [badge.id, badge]))
const base = { targetWeight: 70, unit: 'kg', challengeStartDate: null }

describe('BADGES', () => {
  it('catalogue fixe de 14 badges aux ids stables', () => {
    expect(BADGES.map((b) => b.id)).toEqual([
      'loss-1', 'loss-3', 'loss-5', 'loss-10', 'loss-15', 'loss-20',
      'goal-25', 'goal-50', 'goal-75', 'goal-100',
      'streak-7', 'streak-30', 'photos-10', 'cm-5',
    ])
  })
})

describe('computeBadges — poids perdu', () => {
  it('seuils kg et earnedAt = première date où la condition est vraie', () => {
    const list = entries([['2026-10-01', 90], ['2026-10-05', 89.2], ['2026-10-10', 88.9], ['2026-10-20', 86.5], ['2026-10-25', 87.5]])
    const b = byId(computeBadges({ entries: list, settings: base, today: '2026-10-25' }))
    expect(b['loss-1'].earned).toBe(true)
    expect(b['loss-1'].earnedAt).toBe('2026-10-10')
    expect(b['loss-3'].earnedAt).toBe('2026-10-20')
    expect(b['loss-5'].earned).toBe(false)
    // progression = perte actuelle (regain après le palier)
    expect(b['loss-5'].progress).toEqual({ current: 2.5, target: 5, unit: 'kg' })
  })

  it('seuils lbs du spec (−2, −5, −10, −20, −30, −40)', () => {
    const list = entries([['2026-10-01', 200], ['2026-10-10', 197.5], ['2026-10-20', 194]])
    const b = byId(computeBadges({ entries: list, settings: { ...base, unit: 'lbs', targetWeight: 160 }, today: '2026-10-20' }))
    expect(b['loss-1'].title).toContain('2 lbs')
    expect(b['loss-1'].earnedAt).toBe('2026-10-10')
    expect(b['loss-3'].earnedAt).toBe('2026-10-20')
    expect(b['loss-5'].progress).toEqual({ current: 6, target: 10, unit: 'lbs' })
    expect(b['loss-20'].progress.target).toBe(40)
  })

  it('compte depuis le départ du défi', () => {
    const list = entries([['2026-09-01', 95], ['2026-10-01', 90], ['2026-10-10', 89]])
    const b = byId(computeBadges({ entries: list, settings: { ...base, challengeStartDate: '2026-10-01' }, today: '2026-10-10' }))
    expect(b['loss-1'].earnedAt).toBe('2026-10-10')
    expect(b['loss-3'].earned).toBe(false)
  })
})

describe('computeBadges — objectif', () => {
  it('goal-50 obtenu exactement à 50 %', () => {
    const list = entries([['2026-10-01', 90], ['2026-10-10', 80.5], ['2026-10-20', 80]])
    const b = byId(computeBadges({ entries: list, settings: base, today: '2026-10-20' }))
    expect(b['goal-25'].earnedAt).toBe('2026-10-10')
    expect(b['goal-50'].earned).toBe(true)
    expect(b['goal-50'].earnedAt).toBe('2026-10-20')
    expect(b['goal-75'].earned).toBe(false)
    expect(b['goal-75'].progress).toEqual({ current: 50, target: 75, unit: '%' })
  })

  it('objectif de prise de poids : même logique dans l’autre sens', () => {
    const list = entries([['2026-10-01', 60], ['2026-10-10', 70]])
    const b = byId(computeBadges({ entries: list, settings: { ...base, targetWeight: 70 }, today: '2026-10-10' }))
    expect(b['goal-100'].earnedAt).toBe('2026-10-10')
    expect(b['loss-1'].earned).toBe(false)
  })
})

describe('computeBadges — régularité', () => {
  it('longestStreak = plus longue série (pas seulement l’actuelle)', () => {
    const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-09', '2026-10-10']
    expect(longestStreak(dates)).toEqual({ length: 7, reachedAt: { 7: '2026-10-07' } })
  })

  it('streak-7 : earnedAt = 7e jour consécutif, même si la série est rompue depuis', () => {
    const list = entries(Array.from({ length: 8 }, (_, i) => [`2026-10-${String(i + 1).padStart(2, '0')}`, 80]).concat([['2026-10-20', 80]]))
    const b = byId(computeBadges({ entries: list, settings: base, today: '2026-10-25' }))
    expect(b['streak-7'].earnedAt).toBe('2026-10-07')
    expect(b['streak-30'].progress).toEqual({ current: 8, target: 30, unit: 'jours' })
  })

  it('série à cheval sur un changement d’heure (TZ locale) reste consécutive', () => {
    const dates = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']
    expect(longestStreak(dates).length).toBe(10)
  })
})

describe('computeBadges — photos et mensurations', () => {
  it('photos-10 : 10e photo (table photosByDate)', () => {
    const photos = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`2026-10-${String(i + 10)}`, { storagePath: 'x' }]))
    const b = byId(computeBadges({ entries: [], settings: base, photos, today: '2026-10-25' }))
    expect(b['photos-10'].earned).toBe(true)
    expect(b['photos-10'].earnedAt).toBe('2026-10-19')
    const few = byId(computeBadges({ entries: [], settings: base, photos: { '2026-10-01': { storagePath: 'x' } } }))
    expect(few['photos-10'].progress).toEqual({ current: 1, target: 10, unit: 'photos' })
  })

  it('cm-5 : −5 cm cumulés via mensurations', () => {
    const measurements = [
      { id: 'a', date: '2026-10-01', waist: 100, hips: 110, updatedAt: 1 },
      { id: 'b', date: '2026-10-15', waist: 98, hips: 108, updatedAt: 2 },
      { id: 'c', date: '2026-11-01', waist: 97, hips: 108, updatedAt: 3 },
    ]
    const b = byId(computeBadges({ entries: [], settings: base, measurements, today: '2026-11-01' }))
    expect(b['cm-5'].earnedAt).toBe('2026-11-01')
    const partial = byId(computeBadges({ entries: [], settings: base, measurements: measurements.slice(0, 2) }))
    expect(partial['cm-5'].earned).toBe(false)
    expect(partial['cm-5'].progress).toEqual({ current: 4, target: 5, unit: 'cm' })
  })

  it('aucune donnée → rien d’obtenu, pas d’erreur', () => {
    const badges = computeBadges({ entries: [], settings: base })
    expect(badges).toHaveLength(14)
    expect(badges.every((badge) => !badge.earned && badge.earnedAt === null)).toBe(true)
  })
})

describe('newlyEarned', () => {
  it('obtenus et pas encore vus', () => {
    const badges = [
      { id: 'a', earned: true },
      { id: 'b', earned: true },
      { id: 'c', earned: false },
    ]
    expect(newlyEarned(badges, ['a']).map((badge) => badge.id)).toEqual(['b'])
    expect(newlyEarned(badges, null)).toEqual([])
  })
})

describe('formatBadgeProgress', () => {
  it('« 3,2 / 5 kg », « 50 / 75 % », « 4 / 7 jours »', () => {
    expect(formatBadgeProgress({ current: 3.24, target: 5, unit: 'kg' })).toBe('3,2 / 5 kg')
    expect(formatBadgeProgress({ current: 50, target: 75, unit: '%' })).toBe('50 / 75 %')
    expect(formatBadgeProgress({ current: 4, target: 7, unit: 'jours' })).toBe('4 / 7 jours')
  })
})
