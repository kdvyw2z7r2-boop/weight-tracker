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
}

export const sortByDateDesc = (items) => [...items].sort((a, b) => (a.date < b.date ? 1 : -1))

function normalizeTombstones(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(([id, at]) => id && typeof at === 'number' && Number.isFinite(at)),
  )
}

export function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...defaultSettings, deletedEntries: {} }
  return { ...defaultSettings, ...raw, deletedEntries: normalizeTombstones(raw.deletedEntries) }
}

/** Union par id (createdAt le plus récent gagne, local à égalité), sans les ids supprimés ; tri date DESC. */
export function mergeEntries(cloudEntries, localEntries, tombstones = {}) {
  const deleted = tombstones ?? {}
  const byId = new Map()

  for (const entry of [...cloudEntries, ...localEntries]) {
    if (Object.hasOwn(deleted, entry.id)) continue
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

/** Ajoute les ids retirés entre prevEntries et nextEntries, retire ceux (ré)ajoutés. */
export function updateTombstones(tombstones, prevEntries, nextEntries, now) {
  const result = { ...normalizeTombstones(tombstones) }
  const nextIds = new Set(nextEntries.map((entry) => entry.id))
  for (const entry of prevEntries) {
    if (!nextIds.has(entry.id)) result[entry.id] = now
  }
  for (const id of nextIds) delete result[id]
  return result
}

export function sameTombstones(a, b) {
  const left = normalizeTombstones(a)
  const right = normalizeTombstones(b)
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((id) => left[id] === right[id])
}

/** Le cloud écrase le local, sauf deletedEntries = union des deux, élaguée. */
export function mergeSettings(localSettings, cloudSettings, now = Date.now()) {
  const local = normalizeSettings(localSettings)
  if (!cloudSettings) return { ...local, deletedEntries: pruneTombstones(local.deletedEntries, now) }
  const cloud = normalizeSettings(cloudSettings)
  return {
    ...local,
    ...cloud,
    deletedEntries: pruneTombstones(mergeTombstones(local.deletedEntries, cloud.deletedEntries), now),
  }
}
