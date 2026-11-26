import { describe, expect, it } from 'vitest'
import {
  TOMBSTONE_MAX_AGE_MS,
  defaultSettings,
  mergeEntries,
  mergeSettings,
  mergeTombstones,
  normalizeSettings,
  pruneTombstones,
  updateTombstones,
} from './syncMerge'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 10, 26)

const e = (id, date, createdAt = 1, weight = 80) => ({ id, date, weight, note: '', createdAt })

describe('mergeEntries', () => {
  it('sans tombstones : union par id, createdAt le plus récent gagne, tri date DESC', () => {
    const cloud = [e('a', '2026-11-01', 1, 80), e('b', '2026-11-03', 1)]
    const local = [e('a', '2026-11-01', 5, 79), e('c', '2026-11-02', 1)]
    const merged = mergeEntries(cloud, local)
    expect(merged.map((x) => x.id)).toEqual(['b', 'c', 'a'])
    expect(merged.find((x) => x.id === 'a').weight).toBe(79)
  })

  it('à createdAt égal, le local gagne (comportement existant)', () => {
    const merged = mergeEntries([e('a', '2026-11-01', 1, 80)], [e('a', '2026-11-01', 1, 70)])
    expect(merged[0].weight).toBe(70)
  })

  it('hors ligne : supprimée en local, encore dans le cloud → exclue grâce au tombstone', () => {
    const cloud = [e('a', '2026-11-01'), e('b', '2026-11-02')]
    const local = [e('b', '2026-11-02')]
    expect(mergeEntries(cloud, local, { a: NOW }).map((x) => x.id)).toEqual(['b'])
  })

  it('2e appareil : le local a encore l\'entrée, tombstone venu du cloud → exclue', () => {
    const cloud = [e('b', '2026-11-02')]
    const local = [e('a', '2026-11-01'), e('b', '2026-11-02')]
    expect(mergeEntries(cloud, local, { a: NOW }).map((x) => x.id)).toEqual(['b'])
  })
})

describe('mergeTombstones', () => {
  it('union avec le timestamp max par id', () => {
    expect(mergeTombstones({ a: 1, b: 5 }, { b: 3, c: 2 })).toEqual({ a: 1, b: 5, c: 2 })
  })
  it('tolère undefined / null', () => {
    expect(mergeTombstones(undefined, null)).toEqual({})
    expect(mergeTombstones({ a: 1 }, undefined)).toEqual({ a: 1 })
  })
})

describe('pruneTombstones', () => {
  it('retire les tombstones de plus de 90 jours par défaut', () => {
    expect(TOMBSTONE_MAX_AGE_MS).toBe(90 * DAY)
    const t = { old: NOW - 91 * DAY, edge: NOW - 90 * DAY, recent: NOW - DAY }
    expect(pruneTombstones(t, NOW)).toEqual({ edge: NOW - 90 * DAY, recent: NOW - DAY })
  })
  it('accepte un maxAgeMs personnalisé', () => {
    expect(pruneTombstones({ a: NOW - 2 * DAY, b: NOW }, NOW, DAY)).toEqual({ b: NOW })
  })
})

describe('updateTombstones', () => {
  it('ajoute les ids retirés avec now', () => {
    const prev = [e('a', '2026-11-01'), e('b', '2026-11-02')]
    expect(updateTombstones({}, prev, [prev[1]], NOW)).toEqual({ a: NOW })
  })
  it('ré-ajout : le tombstone de l\'id ré-ajouté est retiré', () => {
    const next = [e('a', '2026-11-01')]
    expect(updateTombstones({ a: NOW - DAY, z: 7 }, [], next, NOW)).toEqual({ z: 7 })
  })
  it('ne modifie pas l\'objet reçu et garde les tombstones existants', () => {
    const tombstones = { x: 1 }
    const prev = [e('a', '2026-11-01')]
    const result = updateTombstones(tombstones, prev, [], NOW)
    expect(result).toEqual({ x: 1, a: NOW })
    expect(tombstones).toEqual({ x: 1 })
  })
  it('tolère des tombstones absents', () => {
    expect(updateTombstones(undefined, [e('a', 'd')], [], NOW)).toEqual({ a: NOW })
  })
})

describe('normalizeSettings', () => {
  it('defaultSettings.deletedEntries = {}', () => {
    expect(defaultSettings.deletedEntries).toEqual({})
    expect(normalizeSettings(null).deletedEntries).toEqual({})
  })
  it('deletedEntries absent ou invalide → {}', () => {
    expect(normalizeSettings({ unit: 'kg' }).deletedEntries).toEqual({})
    expect(normalizeSettings({ deletedEntries: null }).deletedEntries).toEqual({})
    expect(normalizeSettings({ deletedEntries: 'oops' }).deletedEntries).toEqual({})
    expect(normalizeSettings({ deletedEntries: [1, 2] }).deletedEntries).toEqual({})
  })
  it('ne garde que les timestamps numériques finis', () => {
    expect(normalizeSettings({ deletedEntries: { a: 5, b: 'x', c: null, d: NaN } }).deletedEntries).toEqual({ a: 5 })
  })
  it('ne partage pas l\'objet deletedEntries par défaut', () => {
    const s = normalizeSettings(null)
    s.deletedEntries.a = 1
    expect(defaultSettings.deletedEntries).toEqual({})
  })
})

describe('mergeSettings', () => {
  it('cloud écrase local, sauf deletedEntries = union élaguée', () => {
    const local = { targetWeight: 75, unit: 'kg', deletedEntries: { a: NOW - DAY, old: NOW - 200 * DAY } }
    const cloud = { targetWeight: 72, unit: 'kg', deletedEntries: { b: NOW } }
    const merged = mergeSettings(local, cloud, NOW)
    expect(merged.targetWeight).toBe(72)
    expect(merged.deletedEntries).toEqual({ a: NOW - DAY, b: NOW })
  })
  it('sans cloud : renvoie le local normalisé (tombstones élagués)', () => {
    const merged = mergeSettings({ targetWeight: 75, deletedEntries: { a: NOW, old: 1 } }, null, NOW)
    expect(merged.targetWeight).toBe(75)
    expect(merged.deletedEntries).toEqual({ a: NOW })
  })
  it('cloud sans deletedEntries ne perd pas les tombstones locaux', () => {
    const merged = mergeSettings({ deletedEntries: { a: NOW } }, { targetWeight: 60 }, NOW)
    expect(merged.deletedEntries).toEqual({ a: NOW })
  })
})
