import { describe, expect, it } from 'vitest'
import {
  buildChallengeResetPatch,
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

  it('date après toutes les pesées : poids de départ mémorisé', () => {
    expect(
      resolveChallengeStart({ challengeStartDate: '2026-12-01', challengeStartWeight: 79.5 }, entries),
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
