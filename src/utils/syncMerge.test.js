import { describe, expect, it } from 'vitest'
import {
  TOMBSTONE_MAX_AGE_MS,
  defaultSettings,
  mergeEntries,
  mergeSettings,
  mergeTombstones,
  normalizeSettings,
  mergeForLoad,
  mergeForSave,
  mergeMeasurements,
  pruneTombstones,
  updateSyncMarkers,
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

describe('updateSyncMarkers', () => {
  it('ajoute les ids retirés avec now (deletedAt)', () => {
    const prev = [e('a', '2026-11-01'), e('b', '2026-11-02')]
    expect(updateSyncMarkers({}, prev, [prev[1]], NOW)).toEqual({ deletedEntries: { a: NOW }, restoredEntries: {} })
  })
  it('ré-ajout d\'un id supprimé : restoredAt = now, le tombstone est conservé', () => {
    const next = [e('a', '2026-11-01')]
    const result = updateSyncMarkers({ deletedEntries: { a: NOW - DAY, z: 7 } }, [], next, NOW)
    expect(result).toEqual({ deletedEntries: { a: NOW - DAY, z: 7 }, restoredEntries: { a: NOW } })
  })
  it('un nouvel id jamais supprimé ne crée pas de marqueur', () => {
    expect(updateSyncMarkers({}, [], [e('n', '2026-11-01')], NOW)).toEqual({ deletedEntries: {}, restoredEntries: {} })
  })
  it('re-suppression après restauration : le deletedAt plus récent l\'emporte', () => {
    const markers = { deletedEntries: { a: NOW - 2 * DAY }, restoredEntries: { a: NOW - DAY } }
    const result = updateSyncMarkers(markers, [e('a', 'd')], [], NOW)
    expect(result.deletedEntries.a).toBe(NOW)
    expect(mergeEntries([e('a', 'd')], [], result.deletedEntries, result.restoredEntries)).toEqual([])
  })
  it('ne modifie pas les objets reçus et tolère des marqueurs absents', () => {
    const markers = { deletedEntries: { x: 1 }, restoredEntries: {} }
    updateSyncMarkers(markers, [e('a', 'd')], [], NOW)
    expect(markers).toEqual({ deletedEntries: { x: 1 }, restoredEntries: {} })
    expect(updateSyncMarkers(undefined, [e('a', 'd')], [], NOW).deletedEntries).toEqual({ a: NOW })
  })
})

describe('mergeEntries avec restaurations', () => {
  it('supprimée ssi deletedAt > restoredAt', () => {
    const cloud = [e('a', '2026-11-01'), e('b', '2026-11-02'), e('c', '2026-11-03')]
    const deleted = { a: 10, b: 10, c: 10 }
    const restored = { a: 20, b: 5 }
    expect(mergeEntries(cloud, [], deleted, restored).map((x) => x.id)).toEqual(['a'])
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

describe('mergeSettings — restaurations', () => {
  it('union max + élagage des restoredEntries', () => {
    const merged = mergeSettings(
      { restoredEntries: { a: NOW - DAY, old: NOW - 200 * DAY } },
      { restoredEntries: { a: NOW, b: NOW } },
      NOW,
    )
    expect(merged.restoredEntries).toEqual({ a: NOW, b: NOW })
  })
  it('élague aussi sans cloud', () => {
    expect(mergeSettings({ restoredEntries: { old: 1, a: NOW } }, null, NOW).restoredEntries).toEqual({ a: NOW })
  })
})

describe('mergeForSave', () => {
  it('appareil resté ouvert (périmé) : n\'écrase ni le tombstone ni la suppression du cloud', () => {
    const cloud = {
      entries: [e('e1', '2026-11-01')],
      settings: { targetWeight: 70, deletedEntries: { e2: NOW - 1000 } },
    }
    const local = {
      entries: [e('e1', '2026-11-01'), e('e2', '2026-11-02'), e('e3', '2026-11-03')],
      settings: { targetWeight: 70, deletedEntries: {} },
    }
    const merged = mergeForSave(local, cloud, NOW)
    expect(merged.entries.map((x) => x.id)).toEqual(['e3', 'e1'])
    expect(merged.settings.deletedEntries).toEqual({ e2: NOW - 1000 })
  })
  it('une entrée ajoutée sur un autre appareil est conservée', () => {
    const cloud = { entries: [e('other', '2026-11-05')], settings: {} }
    const local = { entries: [e('mine', '2026-11-04')], settings: {} }
    expect(mergeForSave(local, cloud, NOW).entries.map((x) => x.id)).toEqual(['other', 'mine'])
  })
  it('une suppression locale l\'emporte sur la copie du cloud', () => {
    const cloud = { entries: [e('a', '2026-11-01'), e('b', '2026-11-02')], settings: {} }
    const local = { entries: [e('b', '2026-11-02')], settings: { deletedEntries: { a: NOW } } }
    expect(mergeForSave(local, cloud, NOW).entries.map((x) => x.id)).toEqual(['b'])
  })
  it('les réglages locaux l\'emportent (sauf marqueurs : union élaguée)', () => {
    const cloud = { entries: [], settings: { targetWeight: 60, unit: 'kg', deletedEntries: { x: NOW, old: 1 } } }
    const local = { entries: [], settings: { targetWeight: 65, unit: 'kg', restoredEntries: { y: NOW } } }
    const merged = mergeForSave(local, cloud, NOW)
    expect(merged.settings.targetWeight).toBe(65)
    expect(merged.settings.deletedEntries).toEqual({ x: NOW })
    expect(merged.settings.restoredEntries).toEqual({ y: NOW })
  })
  it('sans cloud : renvoie le local normalisé, marqueurs élagués', () => {
    const merged = mergeForSave({ entries: [e('a', 'd')], settings: { deletedEntries: { old: 1 } } }, null, NOW)
    expect(merged.entries.map((x) => x.id)).toEqual(['a'])
    expect(merged.settings.deletedEntries).toEqual({})
  })
})

// Simulation de deux appareils, calquée sur useSync (loadData / persist).
function createWorld() {
  let cloud = { entries: [], settings: null }
  const load = (device, now) => {
    const settings = mergeSettings(device.settings, cloud.settings, now)
    const entries = mergeEntries(cloud.entries, device.entries, settings.deletedEntries, settings.restoredEntries)
    cloud = { entries, settings }
    return { entries, settings }
  }
  const persist = (device, nextEntries, nextSettings, now) => {
    const markers = updateSyncMarkers(nextSettings, device.entries, nextEntries, now)
    const local = { entries: nextEntries, settings: { ...normalizeSettings(nextSettings), ...markers } }
    const merged = mergeForSave(local, cloud, now)
    cloud = merged
    return merged
  }
  return { load, persist, cloud: () => cloud }
}

describe('scénarios multi-appareils', () => {
  const backup = [e('a', '2026-11-01'), e('b', '2026-11-02')]

  it('A efface tout → B synchronise → A importe sa sauvegarde → B recharge : les entrées restent', () => {
    const world = createWorld()
    let A = world.persist({ entries: [], settings: null }, backup, null, NOW)
    let B = world.load({ entries: [], settings: null }, NOW + 1)
    expect(B.entries).toHaveLength(2)

    // A : « Effacer tout » (réglages par défaut, marqueurs conservés)
    A = world.persist(A, [], { ...defaultSettings, deletedEntries: A.settings.deletedEntries, restoredEntries: A.settings.restoredEntries }, NOW + 10)
    B = world.load(B, NOW + 20)
    expect(B.entries).toEqual([])
    expect(Object.keys(B.settings.deletedEntries).sort()).toEqual(['a', 'b'])

    // A : import de la sauvegarde
    A = world.persist(A, mergeEntries([], backup), A.settings, NOW + 30)
    expect(A.entries.map((x) => x.id)).toEqual(['b', 'a'])

    // B recharge : garde ses tombstones, mais les restaurations sont plus récentes
    B = world.load(B, NOW + 40)
    expect(B.entries.map((x) => x.id)).toEqual(['b', 'a'])
    expect(world.cloud().entries.map((x) => x.id)).toEqual(['b', 'a'])
  })

  it('suppression puis restauration d\'une entrée, vue par un 2e appareil', () => {
    const world = createWorld()
    let A = world.persist({ entries: [], settings: null }, backup, null, NOW)
    let B = world.load({ entries: [], settings: null }, NOW + 1)
    A = world.persist(A, [backup[1]], A.settings, NOW + 10)
    B = world.load(B, NOW + 11)
    expect(B.entries.map((x) => x.id)).toEqual(['b'])
    world.persist(A, mergeEntries([], [backup[0], ...A.entries]), A.settings, NOW + 20)
    B = world.load(B, NOW + 21)
    expect(B.entries.map((x) => x.id)).toEqual(['b', 'a'])
  })

  it('nouvelle suppression après restauration : la suppression la plus récente gagne partout', () => {
    const world = createWorld()
    let A = world.persist({ entries: [], settings: null }, backup, null, NOW)
    A = world.persist(A, [backup[1]], A.settings, NOW + 10)
    A = world.persist(A, backup, A.settings, NOW + 20)
    const B = world.load({ entries: backup, settings: null }, NOW + 21)
    expect(B.entries).toHaveLength(2)
    world.persist(B, [backup[1]], B.settings, NOW + 30)
    A = world.load(A, NOW + 40)
    expect(A.entries.map((x) => x.id)).toEqual(['b'])
  })

  it('appareil périmé qui ajoute une entrée ne ressuscite pas une suppression', () => {
    const world = createWorld()
    const A = world.persist({ entries: [], settings: null }, backup, null, NOW)
    const B = world.load({ entries: [], settings: null }, NOW + 1)
    world.persist(A, [backup[1]], A.settings, NOW + 10)
    const B2 = world.persist(B, [...B.entries, e('c', '2026-11-03')], B.settings, NOW + 20)
    expect(B2.entries.map((x) => x.id)).toEqual(['c', 'b'])
    expect(world.cloud().settings.deletedEntries).toHaveProperty('a')
  })
})

describe('mergeForLoad', () => {
  const cloud = {
    entries: [e('a', '2026-11-01'), e('c', '2026-11-03')],
    settings: { targetWeight: 70, deletedEntries: { x: NOW } },
  }
  const local = {
    entries: [e('a', '2026-11-01'), e('b', '2026-11-02')],
    settings: { targetWeight: 65, deletedEntries: { y: NOW } },
  }

  it('sans changements locaux en attente : le cloud écrase les réglages, marqueurs unis', () => {
    const merged = mergeForLoad(local, cloud, { hasUnsynced: false, now: NOW })
    expect(merged.settings.targetWeight).toBe(70)
    expect(merged.settings.deletedEntries).toEqual({ x: NOW, y: NOW })
    expect(merged.entries.map((x) => x.id)).toEqual(['c', 'b', 'a'])
  })

  it('réglage modifié hors ligne puis rafraîchissement : la valeur locale est conservée', () => {
    const merged = mergeForLoad(local, cloud, { hasUnsynced: true, now: NOW })
    expect(merged.settings.targetWeight).toBe(65)
    expect(merged.settings.deletedEntries).toEqual({ x: NOW, y: NOW })
    expect(merged.entries.map((x) => x.id)).toEqual(['c', 'b', 'a'])
  })

  it('cloud vide : renvoie le local (élagué)', () => {
    const merged = mergeForLoad(local, { entries: [], settings: null }, { hasUnsynced: false, now: NOW })
    expect(merged.settings.targetWeight).toBe(65)
    expect(merged.entries.map((x) => x.id)).toEqual(['b', 'a'])
  })
})

describe('updateSyncMarkers — import (restoreAdded)', () => {
  it('restoredAt = now pour les ids ajoutés même si le tombstone n\'existe que dans le cloud', () => {
    const imported = [e('a', '2026-11-01')]
    const markers = updateSyncMarkers({}, [], imported, NOW, { restoreAdded: true })
    expect(markers.restoredEntries).toEqual({ a: NOW })
    const cloud = { entries: [], settings: { deletedEntries: { a: NOW - 1000 } } }
    const merged = mergeForSave({ entries: imported, settings: markers }, cloud, NOW)
    expect(merged.entries.map((x) => x.id)).toEqual(['a'])
  })
  it('n\'ajoute rien pour les ids déjà présents', () => {
    const list = [e('a', '2026-11-01')]
    expect(updateSyncMarkers({}, list, list, NOW, { restoreAdded: true }).restoredEntries).toEqual({})
  })
})

describe('mensurations (settings.measurements)', () => {
  const r = (id, date, waist, updatedAt) => ({ id, date, waist, updatedAt })

  it('normalizeSettings : measurements par défaut {} et relevés invalides ignorés', () => {
    expect(normalizeSettings(null).measurements).toEqual({})
    const s = normalizeSettings({ measurements: { a: r('a', '2026-11-01', 90, 1), b: { id: 'b' }, c: 'x' } })
    expect(Object.keys(s.measurements)).toEqual(['a'])
  })

  it('mergeMeasurements : union par id, updatedAt max gagne', () => {
    const a = { x: r('x', '2026-11-01', 90, 10), y: r('y', '2026-11-02', 89, 5) }
    const b = { x: r('x', '2026-11-01', 88, 20), z: r('z', '2026-11-03', 87, 1) }
    const merged = mergeMeasurements(a, b)
    expect(Object.keys(merged).sort()).toEqual(['x', 'y', 'z'])
    expect(merged.x.waist).toBe(88)
    expect(mergeMeasurements(b, a).x.waist).toBe(88)
  })

  it('mergeMeasurements : exclut les ids marqués supprimés', () => {
    const merged = mergeMeasurements({ x: r('x', '2026-11-01', 90, 10) }, {}, { x: NOW }, {})
    expect(merged).toEqual({})
  })

  it('deux appareils ajoutent chacun un relevé hors ligne → les deux survivent (save puis load)', () => {
    const cloud = { entries: [], settings: { ...defaultSettings, measurements: { a: r('a', '2026-11-01', 90, 1) } } }
    const local = { entries: [], settings: { ...defaultSettings, measurements: { b: r('b', '2026-11-02', 89, 2) } } }
    const saved = mergeForSave(local, cloud, NOW)
    expect(Object.keys(saved.settings.measurements).sort()).toEqual(['a', 'b'])
    const loaded = mergeForLoad(local, cloud, { now: NOW })
    expect(Object.keys(loaded.settings.measurements).sort()).toEqual(['a', 'b'])
    expect(Object.keys(mergeSettings(local.settings, cloud.settings, NOW).measurements).sort()).toEqual(['a', 'b'])
  })

  it('modification concurrente → updatedAt max gagne, au chargement comme à la sauvegarde', () => {
    const cloud = { entries: [], settings: { measurements: { a: r('a', '2026-11-01', 90, 50) } } }
    const local = { entries: [], settings: { measurements: { a: r('a', '2026-11-01', 85, 10) } } }
    expect(mergeForSave(local, cloud, NOW).settings.measurements.a.waist).toBe(90)
    expect(mergeForLoad(local, cloud, { now: NOW }).settings.measurements.a.waist).toBe(90)
  })

  it('relevé supprimé sur A (marqueur) → exclu sur B après fusion', () => {
    // A a supprimé « a » et sauvegardé : le cloud porte le marqueur, plus le relevé.
    const cloud = { entries: [], settings: { measurements: {}, deletedEntries: { a: NOW - DAY } } }
    // B a encore « a » en local.
    const local = { entries: [], settings: { measurements: { a: r('a', '2026-11-01', 90, 1) } } }
    expect(mergeForLoad(local, cloud, { now: NOW }).settings.measurements).toEqual({})
    expect(mergeForLoad(local, cloud, { hasUnsynced: true, now: NOW }).settings.measurements).toEqual({})
    expect(mergeForSave(local, cloud, NOW).settings.measurements).toEqual({})
  })

  it('updateSyncMarkers sur les relevés : retrait → marqueur deletedAt', () => {
    const markers = updateSyncMarkers({}, [{ id: 'a' }], [], NOW)
    expect(markers.deletedEntries).toEqual({ a: NOW })
  })

  it('ordre des clés stable (pas de re-sauvegarde inutile)', () => {
    const a = normalizeSettings({ measurements: { b: r('b', '2026-11-02', 1, 1), a: r('a', '2026-11-01', 1, 1) } })
    const b = normalizeSettings({ measurements: { a: r('a', '2026-11-01', 1, 1), b: r('b', '2026-11-02', 1, 1) } })
    expect(JSON.stringify(a.measurements)).toBe(JSON.stringify(b.measurements))
  })
})
