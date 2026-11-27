import { resolveChallengeStart } from './challenge'
import { listMeasurements, measurementProgress, normalizeMeasurement } from './measurements'

const LOSS_TIERS = [
  { id: 'loss-1', kg: 1, lbs: 2 },
  { id: 'loss-3', kg: 3, lbs: 5 },
  { id: 'loss-5', kg: 5, lbs: 10 },
  { id: 'loss-10', kg: 10, lbs: 20 },
  { id: 'loss-15', kg: 15, lbs: 30 },
  { id: 'loss-20', kg: 20, lbs: 40 },
]
const GOAL_TIERS = [25, 50, 75, 100]
const STREAK_TIERS = [7, 30]
const PHOTO_TARGET = 10
const CM_TARGET = 5
const EPSILON = 1e-9

/** Catalogue fixe (14) : ids stables ; le titre des paliers de poids dépend de l'unité. */
export const BADGES = [
  ...LOSS_TIERS.map((tier) => ({ id: tier.id, category: 'loss', icon: 'scale', tier })),
  ...GOAL_TIERS.map((percent) => ({ id: `goal-${percent}`, category: 'goal', icon: 'target', percent })),
  ...STREAK_TIERS.map((days) => ({ id: `streak-${days}`, category: 'streak', icon: 'flame', days })),
  { id: 'photos-10', category: 'photos', icon: 'camera' },
  { id: 'cm-5', category: 'cm', icon: 'ruler' },
]

const round1 = (value) => Math.round(value * 10) / 10
const dayNumber = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000
}

/** Plus longue série de jours consécutifs + date à laquelle chaque palier (7, 30) a été atteint la 1re fois. */
export function longestStreak(dates, tiers = STREAK_TIERS) {
  const days = [...new Set(dates)].sort()
  let length = 0
  let run = 0
  let previous = null
  const reachedAt = {}
  for (const date of days) {
    const current = dayNumber(date)
    run = previous != null && current - previous === 1 ? run + 1 : 1
    previous = current
    length = Math.max(length, run)
    for (const tier of tiers) if (run === tier && !reachedAt[tier]) reachedAt[tier] = date
  }
  return { length, reachedAt }
}

function toMeasurementList(measurements) {
  if (Array.isArray(measurements)) {
    return measurements
      .map(normalizeMeasurement)
      .filter(Boolean)
      .sort((a, b) => (a.date === b.date ? a.updatedAt - b.updatedAt : a.date < b.date ? -1 : 1))
  }
  return listMeasurements(measurements)
}

function photoDates(photos) {
  if (!photos) return []
  const dates = Array.isArray(photos) ? photos.map((photo) => photo?.date) : Object.keys(photos)
  return [...new Set(dates.filter(Boolean))].sort()
}

/**
 * Badges calculés : { id, category, icon, title, description, earned, earnedAt, progress: { current, target, unit } }.
 * earnedAt = première date où la condition devient vraie (parcours chronologique).
 */
export function computeBadges({ entries = [], settings = {}, photos = null, measurements = null } = {}) {
  const unit = settings.unit === 'lbs' ? 'lbs' : 'kg'
  const asc = [...entries].filter((entry) => entry?.date && Number.isFinite(Number(entry.weight)))
  asc.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const start = resolveChallengeStart(settings, entries)
  const since = start ? asc.filter((entry) => entry.date >= start.startDate) : []
  const latest = since[since.length - 1] ?? null
  const lossAt = (entry) => start.startWeight - entry.weight

  const target = Number(settings.targetWeight)
  const goalSpan = start && Number.isFinite(target) ? target - start.startWeight : 0
  const goalPercentAt = (entry) => (goalSpan ? ((entry.weight - start.startWeight) / goalSpan) * 100 : 0)

  const streak = longestStreak(asc.map((entry) => entry.date))
  const photoList = photoDates(photos)

  const cmList = toMeasurementList(measurements)
  const cmSeries = cmList.map((record, index) => ({
    date: record.date,
    total: measurementProgress(cmList.slice(0, index + 1), settings.challengeStartDate ?? null).totalDelta,
  }))
  const latestCm = cmSeries[cmSeries.length - 1]?.total ?? null

  const firstDate = (list, predicate) => list.find(predicate)?.date ?? null

  return BADGES.map((badge) => {
    let title
    let description
    let earnedAt = null
    let progress
    switch (badge.category) {
      case 'loss': {
        const threshold = badge.tier[unit]
        title = `−${threshold} ${unit}`
        description = `${threshold} ${unit} perdus depuis le départ du défi`
        if (start) earnedAt = firstDate(since, (entry) => lossAt(entry) >= threshold - EPSILON)
        progress = { current: latest ? Math.max(0, round1(lossAt(latest))) : 0, target: threshold, unit }
        break
      }
      case 'goal': {
        title = badge.percent === 100 ? 'Objectif atteint' : `${badge.percent} % du chemin`
        description =
          badge.percent === 100 ? 'Tu as atteint ton poids objectif' : `${badge.percent} % du chemin vers ton objectif`
        if (goalSpan) earnedAt = firstDate(since, (entry) => goalPercentAt(entry) >= badge.percent - EPSILON)
        const percent = latest && goalSpan ? Math.floor(goalPercentAt(latest) + EPSILON) : 0
        progress = { current: Math.min(100, Math.max(0, percent)), target: badge.percent, unit: '%' }
        break
      }
      case 'streak':
        title = `${badge.days} jours d’affilée`
        description = `Une pesée chaque jour pendant ${badge.days} jours`
        earnedAt = streak.reachedAt[badge.days] ?? null
        progress = { current: Math.min(streak.length, badge.days), target: badge.days, unit: 'jours' }
        break
      case 'photos':
        title = `${PHOTO_TARGET} photos`
        description = `${PHOTO_TARGET} photos de progression enregistrées`
        earnedAt = photoList[PHOTO_TARGET - 1] ?? null
        progress = { current: Math.min(photoList.length, PHOTO_TARGET), target: PHOTO_TARGET, unit: 'photos' }
        break
      default:
        title = `−${CM_TARGET} cm`
        description = `${CM_TARGET} cm perdus au total sur tes mensurations`
        earnedAt = firstDate(cmSeries, (point) => point.total != null && point.total <= -CM_TARGET + EPSILON)
        progress = { current: latestCm != null ? Math.max(0, round1(-latestCm)) : 0, target: CM_TARGET, unit: 'cm' }
    }
    return {
      id: badge.id,
      category: badge.category,
      icon: badge.icon,
      title,
      description,
      earned: earnedAt != null,
      earnedAt,
      progress,
    }
  })
}

/** Badges obtenus absents de `seenIds` (null = rien à célébrer). */
export function newlyEarned(badges, seenIds) {
  if (!Array.isArray(seenIds)) return []
  const seen = new Set(seenIds)
  return badges.filter((badge) => badge.earned && !seen.has(badge.id))
}

const formatNumber = (value, decimals) => Number(value).toFixed(decimals).replace('.', ',')

/** « 3,2 / 5 kg », « 50 / 75 % », « 4 / 7 jours », « 3 / 10 photos ». */
export function formatBadgeProgress(progress) {
  if (!progress) return ''
  const { current, target, unit } = progress
  const decimal = unit === 'kg' || unit === 'lbs' || unit === 'cm'
  return `${formatNumber(current, decimal ? 1 : 0)} / ${target} ${unit}`
}

/**
 * La liste « vus » ne s'initialise qu'avec des données fiables : après un chargement cloud réussi,
 * ou sans cloud configuré (les données locales font foi). Hors ligne : on attend le cloud, sinon
 * un nouvel appareil célébrerait d'un coup tous les badges au premier chargement réussi.
 */
export function canInitSeenBadges(syncStatus) {
  return syncStatus !== 'local-offline'
}
