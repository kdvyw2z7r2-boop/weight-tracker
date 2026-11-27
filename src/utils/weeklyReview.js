import { addWeeks, endOfWeek, format, isMonday, parseISO, startOfWeek } from 'date-fns'
import { longestStreak } from './badges'
import { resolveChallengeStart } from './challenge'
import { MEASUREMENT_ZONES, listMeasurements, normalizeMeasurement } from './measurements'

const WEEK = { weekStartsOn: 1 }
const ISO = 'yyyy-MM-dd'
const round2 = (value) => Math.round(value * 100) / 100
const round1 = (value) => Math.round(value * 10) / 10

const toDate = (value) => (typeof value === 'string' ? parseISO(value) : value)

/** Semaine locale lundi → dimanche contenant `date` (Date ou 'yyyy-MM-dd'). */
export function weekBounds(date) {
  const day = toDate(date)
  return { start: format(startOfWeek(day, WEEK), ISO), end: format(endOfWeek(day, WEEK), ISO) }
}

/** Lundi décalé de `n` semaines (calendrier local, insensible aux changements d'heure). */
export function shiftWeek(weekStart, n) {
  return format(addWeeks(parseISO(weekStart), n), ISO)
}

const average = (list) => (list.length ? round2(list.reduce((sum, entry) => sum + entry.weight, 0) / list.length) : null)
const inRange = (date, start, end) => date >= start && date <= end

function toMeasurementList(measurements) {
  if (Array.isArray(measurements)) {
    return measurements
      .map(normalizeMeasurement)
      .filter(Boolean)
      .sort((a, b) => (a.date === b.date ? a.updatedAt - b.updatedAt : a.date < b.date ? -1 : 1))
  }
  return listMeasurements(measurements)
}

/** Variation du dernier relevé de la semaine vs le relevé précédent de chaque zone (somme), ou null. */
function weekMeasurementDelta(measurements, start, end) {
  const list = toMeasurementList(measurements)
  const lastIndex = list.findLastIndex((record) => inRange(record.date, start, end))
  if (lastIndex < 0) return null
  const last = list[lastIndex]
  let total = null
  for (const { key } of MEASUREMENT_ZONES) {
    if (last[key] == null) continue
    const previous = list.slice(0, lastIndex).findLast((record) => record[key] != null && record.date < last.date)
    if (previous) total = round1((total ?? 0) + last[key] - previous[key])
  }
  return total == null ? null : { date: last.date, total }
}

function weekPhoto(photos, start, end) {
  if (!photos) return null
  const list = Array.isArray(photos)
    ? photos.filter((photo) => photo?.date)
    : Object.entries(photos).map(([date, photo]) => ({ ...photo, date }))
  const inWeek = list.filter((photo) => inRange(photo.date, start, end)).sort((a, b) => (a.date < b.date ? 1 : -1))
  return inWeek[0] ?? null
}

/** Bilan d'une semaine (lundi `weekStart` → dimanche), null-safe. */
export function weeklyReview({ entries = [], settings = {}, photos = null, measurements = null, badges = [], weekStart }) {
  const start = weekStart
  const end = format(endOfWeek(parseISO(weekStart), WEEK), ISO)
  const prevStart = shiftWeek(weekStart, -1)
  const prevEnd = format(endOfWeek(parseISO(prevStart), WEEK), ISO)

  const weekEntries = entries.filter((entry) => inRange(entry.date, start, end))
  const prevEntries = entries.filter((entry) => inRange(entry.date, prevStart, prevEnd))
  const avg = average(weekEntries)
  const prevAvg = average(prevEntries)
  const deltaAvg = avg != null && prevAvg != null ? round2(avg - prevAvg) : null
  const days = weekEntries.map((entry) => entry.date)

  // Repli : la plus ancienne pesée (entries est en ordre DESC, ne pas prendre entries[0]).
  const oldest = entries.reduce((min, entry) => (!min || entry.date < min.date ? entry : min), null)
  const reference = resolveChallengeStart(settings, entries)?.startWeight ?? oldest?.weight ?? null
  const goalIsLoss = reference == null || Number(settings.targetWeight) <= reference
  const planPace = settings.weeklyPace ? (goalIsLoss ? -1 : 1) * Number(settings.weeklyPace) : null

  return {
    start,
    end,
    avg,
    prevAvg,
    deltaAvg,
    count: weekEntries.length,
    daysLogged: new Set(days).size,
    pace: deltaAvg,
    planPace,
    goalIsLoss,
    bestStreak: longestStreak(days).length,
    photo: weekPhoto(photos, start, end),
    badgesEarned: (badges ?? []).filter((badge) => badge.earned && badge.earnedAt && inRange(badge.earnedAt, start, end)),
    measurementDelta: weekMeasurementDelta(measurements, start, end),
  }
}

/** Le lundi : récap de la semaine écoulée (sauf s'il a été fermé) ; sinon la semaine en cours. */
export function defaultReviewWeek(today, dismissedWeekStart) {
  const day = toDate(today)
  const current = weekBounds(day).start
  if (isMonday(day)) {
    const lastWeek = shiftWeek(current, -1)
    if (dismissedWeekStart !== lastWeek) return { weekStart: lastWeek, isLastWeekRecap: true }
  }
  return { weekStart: current, isLastWeekRecap: false }
}
