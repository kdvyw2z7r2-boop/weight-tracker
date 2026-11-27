/** Mensurations : relevés { id, date, waist?, hips?, chest?, arm?, thigh?, neck?, updatedAt } en cm. */
export const MEASUREMENT_ZONES = [
  { key: 'waist', label: 'Taille' },
  { key: 'hips', label: 'Hanches' },
  { key: 'chest', label: 'Poitrine' },
  { key: 'arm', label: 'Bras' },
  { key: 'thigh', label: 'Cuisse' },
  { key: 'neck', label: 'Cou' },
]

export const ZONE_KEYS = MEASUREMENT_ZONES.map((zone) => zone.key)
export const CM_MIN = 10
export const CM_MAX = 250

const round1 = (value) => Math.round(value * 10) / 10
const hasValue = (record, key) => typeof record?.[key] === 'number' && Number.isFinite(record[key])

/** Relevé normalisé (clés dans un ordre fixe) ou null s'il est invalide ou vide. */
export function normalizeMeasurement(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) return null
  if (typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) return null
  const record = { id: raw.id, date: raw.date }
  let count = 0
  for (const key of ZONE_KEYS) {
    const value = Number(raw[key])
    if (raw[key] != null && raw[key] !== '' && Number.isFinite(value)) {
      record[key] = value
      count += 1
    }
  }
  if (!count) return null
  record.updatedAt = Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : 0
  return record
}

/** Relevés valides, chronologiques (date, puis updatedAt). */
export function listMeasurements(map) {
  if (!map || typeof map !== 'object') return []
  return Object.values(map)
    .map(normalizeMeasurement)
    .filter(Boolean)
    .sort((a, b) => (a.date === b.date ? a.updatedAt - b.updatedAt : a.date < b.date ? -1 : 1))
}

/**
 * Évolution par zone : départ = 1er relevé de la zone à partir du défi (sinon le 1er), arrivée = dernier.
 * delta null si la zone n'a qu'un point utile ; total = somme des deltas connus (null si aucun).
 */
export function measurementProgress(list, challengeStartDate) {
  const byZone = {}
  let totalDelta = null
  let from = null
  let to = null
  for (const key of ZONE_KEYS) {
    const points = (list ?? []).filter((record) => hasValue(record, key))
    if (!points.length) continue
    const sinceStart = challengeStartDate ? points.filter((record) => record.date >= challengeStartDate) : points
    const startRecord = (sinceStart.length ? sinceStart : points)[0]
    const latestRecord = points[points.length - 1]
    const delta = startRecord === latestRecord ? null : round1(latestRecord[key] - startRecord[key])
    byZone[key] = { start: startRecord[key], latest: latestRecord[key], delta }
    if (delta != null) {
      totalDelta = round1((totalDelta ?? 0) + delta)
      if (!from || startRecord.date < from) from = startRecord.date
      if (!to || latestRecord.date > to) to = latestRecord.date
    }
  }
  return { byZone, totalDelta, from, to }
}

export function seriesForZone(list, key) {
  return (list ?? []).filter((record) => hasValue(record, key)).map((record) => ({ date: record.date, value: record[key] }))
}

const NBSP = '\u00a0'

export function formatCmValue(value) {
  return Number(value).toFixed(1).replace('.', ',')
}

export function formatCm(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${formatCmValue(value)}${NBSP}cm`
}

export function formatCmDelta(delta) {
  if (delta == null || Number.isNaN(Number(delta))) return '—'
  const sign = delta < 0 ? '−' : delta > 0 ? '+' : ''
  return `${sign}${formatCm(Math.abs(delta))}`
}
