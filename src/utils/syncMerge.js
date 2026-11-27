import { normalizeMeasurement } from './measurements'

export const TOMBSTONE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

export const defaultSettings = {
  targetWeight: 70,
  height: 178,
  unit: 'kg',
  reminderEnabled: false,
  reminderTime: '08:00',
  theme: 'dark',
  weeklyPace: null,
  planSetupComplete: false,
  planStartDate: null,
  planStartWeight: null,
  challengeStartDate: null,
  challengeStartWeight: null,
  deletedEntries: {},
  restoredEntries: {},
  // Mensurations { [id]: relevé } ; suppressions via deletedEntries/restoredEntries (ids UUID partagés).
  measurements: {},
}

export const sortByDateDesc = (items) => [...items].sort((a, b) => (a.date < b.date ? 1 : -1))

function normalizeTombstones(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(([id, at]) => id && typeof at === 'number' && Number.isFinite(at)),
  )
}

/** Table des relevés, clés triées (JSON stable : pas de re-sauvegarde inutile), relevés invalides ignorés. */
export function normalizeMeasurements(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const records = Object.values(raw).map(normalizeMeasurement).filter(Boolean)
  records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return Object.fromEntries(records.map((record) => [record.id, record]))
}

export function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...defaultSettings, deletedEntries: {}, restoredEntries: {}, measurements: {} }
  }
  return {
    ...defaultSettings,
    ...raw,
    deletedEntries: normalizeTombstones(raw.deletedEntries),
    restoredEntries: normalizeTombstones(raw.restoredEntries),
    measurements: normalizeMeasurements(raw.measurements),
  }
}

/** Une entrée est supprimée ssi deletedAt > (restoredAt ?? 0). */
export function isDeletedEntry(id, deleted = {}, restored = {}) {
  const deletedAt = deleted?.[id]
  if (deletedAt == null) return false
  return deletedAt > (restored?.[id] ?? 0)
}

/** Union par id (createdAt le plus récent gagne, local à égalité), sans les ids supprimés ; tri date DESC. */
export function mergeEntries(cloudEntries, localEntries, tombstones = {}, restores = {}) {
  const byId = new Map()

  for (const entry of [...cloudEntries, ...localEntries]) {
    if (isDeletedEntry(entry.id, tombstones, restores)) continue
    const existing = byId.get(entry.id)
    if (!existing || (entry.createdAt ?? 0) >= (existing.createdAt ?? 0)) {
      byId.set(entry.id, entry)
    }
  }

  return sortByDateDesc([...byId.values()])
}

/** Union par id des relevés (updatedAt le plus récent gagne, `b` à égalité), sans les ids supprimés. */
export function mergeMeasurements(a, b, tombstones = {}, restores = {}) {
  const byId = new Map()
  for (const record of [...Object.values(normalizeMeasurements(a)), ...Object.values(normalizeMeasurements(b))]) {
    if (isDeletedEntry(record.id, tombstones, restores)) continue
    const existing = byId.get(record.id)
    if (!existing || record.updatedAt >= existing.updatedAt) byId.set(record.id, record)
  }
  return normalizeMeasurements(Object.fromEntries(byId))
}

export function mergeTombstones(a, b) {
  const result = { ...normalizeTombstones(a) }
  for (const [id, at] of Object.entries(normalizeTombstones(b))) {
    if (!(id in result) || at > result[id]) result[id] = at
  }
  return result
}

export function pruneTombstones(tombstones, now, maxAgeMs = TOMBSTONE_MAX_AGE_MS) {
  return Object.fromEntries(
    Object.entries(normalizeTombstones(tombstones)).filter(([, at]) => now - at <= maxAgeMs),
  )
}

/**
 * Marqueurs de synchro après un changement local : deletedAt = now pour les ids retirés,
 * restoredAt = now pour les ids (ré)ajoutés qui étaient supprimés — ou pour tout id ajouté avec
 * { restoreAdded: true } (import : le tombstone peut n'exister que dans le cloud).
 */
export function updateSyncMarkers(markers, prevEntries, nextEntries, now, { restoreAdded = false } = {}) {
  const deletedEntries = normalizeTombstones(markers?.deletedEntries)
  const restoredEntries = normalizeTombstones(markers?.restoredEntries)
  const prevIds = new Set(prevEntries.map((entry) => entry.id))
  const nextIds = new Set(nextEntries.map((entry) => entry.id))
  for (const id of prevIds) {
    if (!nextIds.has(id)) deletedEntries[id] = now
  }
  for (const id of nextIds) {
    if (prevIds.has(id)) continue
    if (restoreAdded || isDeletedEntry(id, deletedEntries, restoredEntries)) restoredEntries[id] = now
  }
  return { deletedEntries, restoredEntries }
}

export function pruneMarkers(settings, now) {
  return {
    ...settings,
    deletedEntries: pruneTombstones(settings.deletedEntries, now),
    restoredEntries: pruneTombstones(settings.restoredEntries, now),
  }
}

function unionMarkers(a, b, now) {
  return {
    deletedEntries: pruneTombstones(mergeTombstones(a.deletedEntries, b.deletedEntries), now),
    restoredEntries: pruneTombstones(mergeTombstones(a.restoredEntries, b.restoredEntries), now),
  }
}

function unionMeasurements(a, b, markers) {
  return mergeMeasurements(a.measurements, b.measurements, markers.deletedEntries, markers.restoredEntries)
}

export function sameTombstones(a, b) {
  const left = normalizeTombstones(a)
  const right = normalizeTombstones(b)
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((id) => left[id] === right[id])
}

/** Chargement : le cloud écrase le local, sauf les marqueurs (union élaguée). */
export function mergeSettings(localSettings, cloudSettings, now = Date.now()) {
  const local = normalizeSettings(localSettings)
  if (!cloudSettings) return pruneMarkers(local, now)
  const cloud = normalizeSettings(cloudSettings)
  const markers = unionMarkers(local, cloud, now)
  return { ...local, ...cloud, ...markers, measurements: unionMeasurements(cloud, local, markers) }
}

/**
 * Import d'une sauvegarde JSON : comme mergeSettings, mais les mensurations de la sauvegarde font
 * foi (comme les pesées), sans filtrage par les tombstones locales ; persist(restoreAdded) pose
 * ensuite les marqueurs de restauration. Sauvegarde sans mensurations : on garde les actuelles.
 */
export function settingsForImport(currentSettings, backupSettings, now = Date.now()) {
  const merged = mergeSettings(currentSettings, backupSettings, now)
  if (!backupSettings || typeof backupSettings !== 'object' || !('measurements' in backupSettings)) {
    return { ...merged, measurements: normalizeSettings(currentSettings).measurements }
  }
  return { ...merged, measurements: normalizeMeasurements(backupSettings.measurements) }
}

/**
 * Sauvegarde (lecture-fusion-écriture) : les réglages locaux l'emportent (l'utilisateur vient de
 * les changer), les marqueurs sont unis, et les entrées du cloud non supprimées sont conservées.
 */
export function mergeForSave(local, cloud, now = Date.now()) {
  const localSettings = normalizeSettings(local.settings)
  if (!cloud) {
    const pruned = pruneMarkers(localSettings, now)
    const settings = { ...pruned, measurements: unionMeasurements(pruned, {}, pruned) }
    return { entries: mergeEntries([], local.entries, settings.deletedEntries, settings.restoredEntries), settings }
  }
  const cloudSettings = normalizeSettings(cloud.settings)
  const markers = unionMarkers(localSettings, cloudSettings, now)
  const settings = {
    ...cloudSettings,
    ...localSettings,
    ...markers,
    measurements: unionMeasurements(cloudSettings, localSettings, markers),
  }
  const entries = mergeEntries(cloud.entries ?? [], local.entries, settings.deletedEntries, settings.restoredEntries)
  return { entries, settings }
}

/**
 * Chargement : le cloud écrase les réglages locaux, sauf si des changements locaux n'ont pas encore
 * été synchronisés (hasUnsynced) — alors le local l'emporte, comme pour une sauvegarde.
 */
export function mergeForLoad(local, cloud, { hasUnsynced = false, now = Date.now() } = {}) {
  if (hasUnsynced) return mergeForSave(local, cloud, now)
  const settings = mergeSettings(local.settings, cloud?.settings ?? null, now)
  const entries = mergeEntries(cloud?.entries ?? [], local.entries, settings.deletedEntries, settings.restoredEntries)
  return { entries, settings }
}
