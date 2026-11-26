import { describe, expect, it } from 'vitest'
import {
  buildChallengeResetPatch,
  buildChallengeRestorePatch,
  findChallengeAnchor,
  getChallengeEntries,
  resolveChallengeStart,
} from './challenge'

const entries = [
  { date: '2026-11-20', weight: 80 },
  { date: '2026-11-10', weight: 83 },
  { date: '2026-11-01', weight: 85 },
]

describe('getChallengeEntries', () => {
  it('retourne toutes les pesées sans date de défi', () => {
    expect(getChallengeEntries(entries, null)).toBe(entries)
  })

  it('filtre les pesées antérieures à la date (bornes incluses) en conservant l\'ordre', () => {
    expect(getChallengeEntries(entries, '2026-11-10').map((e) => e.date)).toEqual([
      '2026-11-20',
      '2026-11-10',
    ])
  })
})

describe('resolveChallengeStart', () => {
  it('sans date : première pesée', () => {
    expect(resolveChallengeStart({}, entries)).toEqual({ startDate: '2026-11-01', startWeight: 85 })
  })

  it('avec date : première pesée >= date', () => {
    expect(resolveChallengeStart({ challengeStartDate: '2026-11-05' }, entries)).toEqual({
      startDate: '2026-11-05',
      startWeight: 83,
    })
  })

  it('date après toutes les pesées : dernière pesée avant la date', () => {
    expect(
      resolveChallengeStart({ challengeStartDate: '2026-12-01', challengeStartWeight: 79.5 }, entries),
    ).toEqual({ startDate: '2026-12-01', startWeight: 80 })
  })

  it('aucune pesée mais poids mémorisé : poids mémorisé', () => {
    expect(
      resolveChallengeStart({ challengeStartDate: '2026-12-01', challengeStartWeight: 79.5 }, []),
    ).toEqual({ startDate: '2026-12-01', startWeight: 79.5 })
  })

  it('aucune pesée : null', () => {
    expect(resolveChallengeStart({}, [])).toBeNull()
  })
})

describe('buildChallengeResetPatch', () => {
  it('sans rythme : pas de champs de plan', () => {
    expect(buildChallengeResetPatch(entries, '2026-11-10', {})).toEqual({
      challengeStartDate: '2026-11-10',
      challengeStartWeight: 83,
    })
  })

  it('avec rythme : ré-ancre le plan', () => {
    expect(buildChallengeResetPatch(entries, '2026-11-10', { weeklyPace: 0.4 })).toEqual({
      challengeStartDate: '2026-11-10',
      challengeStartWeight: 83,
      planStartDate: '2026-11-10',
      planStartWeight: 83,
    })
  })

  it('sans pesée : poids null et pas de champs de plan', () => {
    expect(buildChallengeResetPatch([], '2026-11-10', { weeklyPace: 0.4 })).toEqual({
      challengeStartDate: '2026-11-10',
      challengeStartWeight: null,
    })
  })
})

describe('findChallengeAnchor', () => {
  it('date entre deux pesées : 1re pesée après la date', () => {
    expect(findChallengeAnchor(entries, '2026-11-05')?.weight).toBe(83)
  })

  it('date avant toutes les pesées : 1re pesée', () => {
    expect(findChallengeAnchor(entries, '2026-10-15')?.weight).toBe(85)
  })

  it('date après toutes les pesées : dernière pesée avant', () => {
    expect(findChallengeAnchor(entries, '2026-12-01')?.weight).toBe(80)
  })

  it('aucune pesée : null', () => {
    expect(findChallengeAnchor([], '2026-11-05')).toBeNull()
  })
})

describe('reset : plan et anneau partent du même point', () => {
  it.each([
    ['2026-11-05', 83],
    ['2026-10-15', 85],
    ['2026-12-01', 80],
  ])('reset au %s → %d kg pour le plan et pour l\'anneau', (date, expected) => {
    const patch = buildChallengeResetPatch(entries, date, { weeklyPace: 0.4 })
    expect(patch.planStartDate).toBe(date)
    expect(patch.planStartWeight).toBe(expected)
    expect(patch.challengeStartWeight).toBe(expected)
    const start = resolveChallengeStart({ weeklyPace: 0.4, ...patch }, entries)
    expect(patch.planStartWeight).toBe(start.startWeight)
  })
})

describe('buildChallengeRestorePatch', () => {
  it('sans rythme : efface seulement la date du défi', () => {
    expect(buildChallengeRestorePatch(entries, { challengeStartDate: '2026-11-10' })).toEqual({
      challengeStartDate: null,
      challengeStartWeight: null,
    })
  })

  it('avec rythme : ré-ancre le plan sur la toute première pesée', () => {
    expect(
      buildChallengeRestorePatch(entries, { challengeStartDate: '2026-11-10', weeklyPace: 0.4 }),
    ).toEqual({
      challengeStartDate: null,
      challengeStartWeight: null,
      planStartDate: '2026-11-01',
      planStartWeight: 85,
    })
  })

  it('avec rythme mais aucune pesée : pas de champs de plan', () => {
    expect(buildChallengeRestorePatch([], { weeklyPace: 0.4 })).toEqual({
      challengeStartDate: null,
      challengeStartWeight: null,
    })
  })
})
