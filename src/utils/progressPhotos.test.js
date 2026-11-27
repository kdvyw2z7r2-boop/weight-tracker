import { describe, expect, it } from 'vitest'
import {
  availableShortcuts,
  defaultPair,
  ghostFor,
  groupByMonth,
  listPhotos,
  nearestPhoto,
  pairForJournalDate,
  pairStats,
  selectForSlot,
  shortcutDisabledReason,
  shortcutPair,
  weightForDate,
} from './progressPhotos'

const entries = [
  { id: 'a', date: '2026-10-01', weight: 85, createdAt: 1 },
  { id: 'b', date: '2026-10-21', weight: 83, createdAt: 2 },
  { id: 'c', date: '2026-11-26', weight: 80, createdAt: 3 },
]
const photosByDate = Object.fromEntries(
  ['2026-10-01', '2026-10-20', '2026-11-10', '2026-11-26'].map((d) => [
    d,
    { storagePath: `u/${d}.jpg`, url: `https://x/${d}` },
  ]),
)
const photos = listPhotos(photosByDate, entries)
const ctx = { today: '2026-11-27', challengeStartDate: null }

describe('progressPhotos', () => {
  it('weightForDate', () => {
    expect(weightForDate(entries, '2026-10-20')).toBe(83)
    expect(weightForDate(entries, '2026-11-10')).toBeNull()
    expect(weightForDate([...entries, { date: '2026-10-01', weight: 84, createdAt: 9 }], '2026-10-01')).toBe(84)
    expect(weightForDate([{ date: '2026-10-01', weight: 1, createdAt: 1 }, { date: '2026-10-05', weight: 2, createdAt: 1 }], '2026-10-03')).toBe(1)
  })

  it('listPhotos trie et attache les poids', () => {
    expect(photos.map((p) => p.date)).toEqual(['2026-10-01', '2026-10-20', '2026-11-10', '2026-11-26'])
    expect(photos.map((p) => p.weight)).toEqual([85, 83, null, 80])
  })

  it('nearestPhoto', () => {
    expect(nearestPhoto(photos, '2026-10-27').date).toBe('2026-10-20')
    expect(nearestPhoto(photos, '2026-11-18').date).toBe('2026-11-10')
    expect(nearestPhoto(photos, '2026-11-26', { exclude: '2026-11-26' }).date).toBe('2026-11-10')
  })

  it('shortcutPair', () => {
    expect(shortcutPair(photos, 'start', ctx)).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-11-26' } })
    expect(shortcutPair(photos, 'd30', ctx).before.date).toBe('2026-10-20')
    expect(shortcutPair(photos, 'd7', ctx).before.date).toBe('2026-11-10')
    expect(shortcutPair([photos[0]], 'd7', ctx)).toBeNull()
    expect(shortcutPair([photos[0]], 'start', ctx)).toMatchObject({ before: { date: '2026-10-01' }, after: null })
    expect(shortcutPair(photos, 'start', { ...ctx, challengeStartDate: '2026-10-15' }).before.date).toBe('2026-10-20')
    expect(shortcutPair([], 'start', ctx)).toBeNull()
  })

  it('availableShortcuts', () => {
    expect(availableShortcuts(photos, ctx)).toEqual({ start: true, d30: true, d7: true })
    expect(availableShortcuts([photos[0]], ctx)).toEqual({ start: true, d30: false, d7: false })
  })

  it('selectForSlot', () => {
    const p = { before: photos[0], after: photos[3] }
    expect(selectForSlot(p, 'before', photos[3], photos)).toMatchObject({ before: { date: '2026-11-10' }, after: { date: '2026-11-26' } })
    expect(selectForSlot({ before: photos[1], after: photos[2] }, 'after', photos[0], photos)).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-10-20' } })
  })

  it('pairStats', () => {
    expect(pairStats({ before: photos[0], after: photos[3] }, { goalIsLoss: true })).toEqual({ days: 56, delta: -5, isGood: true })
    expect(pairStats({ before: photos[0], after: photos[3] }, { goalIsLoss: false }).isGood).toBe(false)
    expect(pairStats({ before: photos[2], after: photos[3] }, { goalIsLoss: true }).delta).toBeNull()
    expect(pairStats({ before: photos[0], after: null }, { goalIsLoss: true })).toEqual({ days: null, delta: null, isGood: null })
  })

  it('groupByMonth / ghostFor', () => {
    expect(groupByMonth(photos).map((g) => g.monthKey)).toEqual(['2026-10', '2026-11'])
    expect(ghostFor(photos, '2026-11-10').date).toBe('2026-11-10')
    expect(ghostFor(photos, '2026-11-15').date).toBe('2026-11-10')
    expect(ghostFor(photos, '2026-09-01')).toBeNull()
  })

  it('pairForJournalDate', () => {
    expect(pairForJournalDate(photos, '2026-11-10', { before: photos[0], after: photos[3] })).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-11-10' } })
    expect(pairForJournalDate(photos, '2026-10-01', { before: photos[1], after: photos[3] })).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-11-26' } })
    expect(pairForJournalDate(photos, '2026-10-20', { before: photos[2], after: photos[3] })).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-10-20' } })
    expect(pairForJournalDate(photos, '2026-09-01', null)).toBeNull()
  })

  it('selectForSlot avec peu de photos', () => {
    const one = [photos[0]]
    expect(selectForSlot({ before: photos[0], after: null }, 'after', photos[0], one)).toEqual({ before: photos[0], after: null })
    expect(selectForSlot({ before: photos[0], after: null }, 'before', photos[0], one)).toEqual({ before: photos[0], after: null })
    const two = [photos[0], photos[1]]
    expect(selectForSlot({ before: photos[0], after: photos[1] }, 'after', photos[0], two)).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-10-20' } })
    expect(selectForSlot({ before: photos[0], after: photos[1] }, 'before', photos[1], two)).toMatchObject({ before: { date: '2026-10-01' }, after: { date: '2026-10-20' } })
  })

  it('pairStats défensif', () => {
    expect(pairStats({ before: null, after: photos[0] }, { goalIsLoss: true })).toEqual({ days: null, delta: null, isGood: null })
  })

  it('cas limites', () => {
    expect(shortcutPair(photos, 'start', { ...ctx, challengeStartDate: '2027-01-01' }).before.date).toBe('2026-10-01')
    const withNull = listPhotos({ '2026-10-01': { storagePath: 'p', url: null } }, [])
    expect(withNull).toEqual([{ date: '2026-10-01', url: null, storagePath: 'p', weight: null }])
    expect(pairForJournalDate([photos[0]], '2026-10-01', null)).toEqual({ before: photos[0], after: null })
  })

  describe('defaultPair', () => {
    const dates = (pair) => pair && [pair.before.date, pair.after?.date ?? null]

    it('Départ quand il est disponible', () => {
      expect(dates(defaultPair(photos, ctx))).toEqual(['2026-10-01', '2026-11-26'])
    })

    it('défi démarré le jour de la dernière photo : repli sur 30 jours', () => {
      const c = { today: '2026-11-26', challengeStartDate: '2026-11-26' }
      expect(shortcutPair(photos, 'start', c)).toBeNull()
      expect(dates(defaultPair(photos, c))).toEqual(['2026-10-20', '2026-11-26'])
    })

    it('défi démarré aujourd’hui avec une photo du jour', () => {
      const withToday = listPhotos(
        { ...photosByDate, '2026-11-27': { storagePath: 'u/t.jpg', url: 'https://x/t' } },
        entries,
      )
      const c = { today: '2026-11-27', challengeStartDate: '2026-11-27' }
      const pair = defaultPair(withToday, c)
      expect(pair).not.toBeNull()
      expect(pair.after.date).toBe('2026-11-27')
      expect(pair.before.date < pair.after.date).toBe(true)
    })

    it('défi aujourd’hui sans photo du jour : Départ = première photo', () => {
      const c = { today: '2026-11-27', challengeStartDate: '2026-11-27' }
      expect(dates(defaultPair(photos, c))).toEqual(['2026-10-01', '2026-11-26'])
    })

    it('deux photos le jour du défi ou après : repli sur 30 jours', () => {
      const two = photos.slice(2)
      const c = { today: '2026-11-26', challengeStartDate: '2026-11-26' }
      expect(shortcutPair(two, 'start', c)).toBeNull()
      expect(dates(defaultPair(two, c))).toEqual(['2026-11-10', '2026-11-26'])
    })

    it('une photo seule, aucune photo', () => {
      expect(dates(defaultPair(photos.slice(0, 1), ctx))).toEqual(['2026-10-01', null])
      expect(defaultPair([], ctx)).toBeNull()
    })
  })

  describe('shortcutDisabledReason', () => {
    it('Départ bloqué par la date du défi', () => {
      const c = { today: '2026-11-26', challengeStartDate: '2026-11-26' }
      expect(shortcutDisabledReason(photos, 'start', c)).toBe('Le défi vient de commencer')
    })

    it('sinon « Pas assez de photos »', () => {
      const c = { today: '2026-11-27', challengeStartDate: null }
      expect(shortcutDisabledReason(photos.slice(0, 1), 'd7', c)).toBe('Pas assez de photos')
      expect(shortcutDisabledReason([], 'start', c)).toBe('Pas assez de photos')
    })

    it('null quand le raccourci est disponible', () => {
      expect(shortcutDisabledReason(photos, 'start', ctx)).toBeNull()
    })
  })
})
