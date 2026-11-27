import { describe, expect, it } from 'vitest'
import { defaultReviewWeek, shiftWeek, weekBounds, weeklyReview } from './weeklyReview'

const entries = (list) =>
  list.map(([date, weight], i) => ({ id: `e${i}`, date, weight, note: '', createdAt: i })).sort((a, b) => (a.date < b.date ? 1 : -1))

describe('weekBounds', () => {
  it('lundi → dimanche (vendredi 27 nov. 2026)', () => {
    expect(weekBounds(new Date(2026, 10, 27, 12))).toEqual({ start: '2026-11-23', end: '2026-11-29' })
  })

  it('dimanche soir reste dans la semaine qui finit ce dimanche', () => {
    expect(weekBounds(new Date(2026, 10, 29, 23, 30))).toEqual({ start: '2026-11-23', end: '2026-11-29' })
  })

  it('lundi minuit commence une nouvelle semaine', () => {
    expect(weekBounds(new Date(2026, 10, 30, 0, 5))).toEqual({ start: '2026-11-30', end: '2026-12-06' })
  })

  it('accepte une date ISO (heure locale, pas UTC)', () => {
    expect(weekBounds('2026-11-29')).toEqual({ start: '2026-11-23', end: '2026-11-29' })
    expect(weekBounds('2026-11-30')).toEqual({ start: '2026-11-30', end: '2026-12-06' })
  })

  it('shiftWeek : ±n semaines (passage à l’heure d’hiver inclus)', () => {
    expect(shiftWeek('2026-11-02', -1)).toBe('2026-10-26')
    expect(shiftWeek('2026-10-26', 1)).toBe('2026-11-02')
  })
})

describe('weeklyReview', () => {
  const settings = { targetWeight: 70, unit: 'kg', weeklyPace: 0.5, challengeStartDate: null }

  it('moyenne de la semaine, delta vs semaine précédente, pesées /7', () => {
    const list = entries([
      ['2026-11-16', 82], ['2026-11-18', 81], // semaine précédente : 81,5
      ['2026-11-23', 81], ['2026-11-24', 80.5], ['2026-11-25', 80], ['2026-11-27', 80.5], // 80,5
    ])
    const review = weeklyReview({ entries: list, settings, weekStart: '2026-11-23' })
    expect(review.start).toBe('2026-11-23')
    expect(review.end).toBe('2026-11-29')
    expect(review.avg).toBe(80.5)
    expect(review.prevAvg).toBe(81.5)
    expect(review.deltaAvg).toBe(-1)
    expect(review.count).toBe(4)
    expect(review.daysLogged).toBe(4)
    expect(review.bestStreak).toBe(3)
    expect(review.pace).toBe(-1)
    expect(review.planPace).toBe(-0.5)
  })

  it('semaine sans pesée → valeurs null, sans erreur', () => {
    const review = weeklyReview({ entries: entries([['2026-11-02', 80]]), settings, weekStart: '2026-11-23' })
    expect(review).toMatchObject({ avg: null, prevAvg: null, deltaAvg: null, count: 0, daysLogged: 0, bestStreak: 0, photo: null, measurementDelta: null })
    expect(review.badgesEarned).toEqual([])
  })

  it('photo la plus récente de la semaine, badges obtenus dans la semaine, variation mensurations', () => {
    const photos = {
      '2026-11-20': { storagePath: 'a', url: 'u0' },
      '2026-11-24': { storagePath: 'b', url: 'u1' },
      '2026-11-26': { storagePath: 'c', url: 'u2' },
    }
    const badges = [
      { id: 'loss-1', earned: true, earnedAt: '2026-11-25' },
      { id: 'loss-3', earned: true, earnedAt: '2026-11-10' },
      { id: 'loss-5', earned: false, earnedAt: null },
    ]
    const measurements = [
      { id: 'm1', date: '2026-11-15', waist: 95, hips: 105, updatedAt: 1 },
      { id: 'm2', date: '2026-11-25', waist: 93.5, updatedAt: 2 },
    ]
    const review = weeklyReview({ entries: [], settings, photos, badges, measurements, weekStart: '2026-11-23' })
    expect(review.photo).toEqual({ date: '2026-11-26', url: 'u2', storagePath: 'c' })
    expect(review.badgesEarned.map((b) => b.id)).toEqual(['loss-1'])
    expect(review.measurementDelta).toEqual({ date: '2026-11-25', total: -1.5 })
  })

  it('sans plan → planPace null ; objectif de prise → planPace positif', () => {
    expect(weeklyReview({ entries: [], settings: { ...settings, weeklyPace: null }, weekStart: '2026-11-23' }).planPace).toBeNull()
    const gain = weeklyReview({ entries: entries([['2026-11-01', 60]]), settings: { ...settings, targetWeight: 70 }, weekStart: '2026-11-23' })
    expect(gain.planPace).toBe(0.5)
  })
})

describe('defaultReviewWeek', () => {
  it('lundi → récap de la semaine écoulée', () => {
    expect(defaultReviewWeek(new Date(2026, 10, 30, 8), null)).toEqual({ weekStart: '2026-11-23', isLastWeekRecap: true })
  })

  it('récap fermé → semaine courante', () => {
    expect(defaultReviewWeek(new Date(2026, 10, 30, 8), '2026-11-23')).toEqual({ weekStart: '2026-11-30', isLastWeekRecap: false })
  })

  it('un ancien récap fermé n’empêche pas celui de cette semaine', () => {
    expect(defaultReviewWeek(new Date(2026, 10, 30, 8), '2026-11-16').isLastWeekRecap).toBe(true)
  })

  it('autres jours → semaine courante (dimanche soir inclus)', () => {
    expect(defaultReviewWeek(new Date(2026, 10, 27, 8), null)).toEqual({ weekStart: '2026-11-23', isLastWeekRecap: false })
    expect(defaultReviewWeek(new Date(2026, 10, 29, 23, 59), null)).toEqual({ weekStart: '2026-11-23', isLastWeekRecap: false })
  })
})
