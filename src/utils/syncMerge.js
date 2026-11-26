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
}

export const sortByDateDesc = (items) => [...items].sort((a, b) => (a.date < b.date ? 1 : -1))

function normalizeTombstones(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(([id, at]) => id && typeof at === 'number' && Number.isFinite(at)),
  )
}

export function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...defaultSettings, deletedEntries: {}, restoredEntries: {} }
  return {
    ...defaultSettings,
    ...raw,
    deletedEntries: normalizeTombstones(raw.deletedEntries),
    restoredEntries: normalizeTombstones(raw.restoredEntries),
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
  return { ...local, ...cloud, ...unionMarkers(local, cloud, now) }
}

/**
 * Sauvegarde (lecture-fusion-écriture) : les réglages locaux l'emportent (l'utilisateur vient de
 * les changer), les marqueurs sont unis, et les entrées du cloud non supprimées sont conservées.
 */
export function mergeForSave(local, cloud, now = Date.now()) {
  const localSettings = normalizeSettings(local.settings)
  if (!cloud) {
    const settings = pruneMarkers(localSettings, now)
    return { entries: mergeEntries([], local.entries, settings.deletedEntries, settings.restoredEntries), settings }
  }
  const cloudSettings = normalizeSettings(cloud.settings)
  const settings = { ...cloudSettings, ...localSettings, ...unionMarkers(localSettings, cloudSettings, now) }
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
