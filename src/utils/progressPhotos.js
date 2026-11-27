import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'

/**
 * @typedef {{ date: string, url: string|null, storagePath: string, weight: number|null }} PhotoItem
 * @typedef {{ before: PhotoItem, after: PhotoItem|null }} Pair
 */

const dayGap = (a, b) => differenceInCalendarDays(parseISO(a), parseISO(b))
const latestWeight = (dayEntries) =>
  [...dayEntries].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0].weight

/** Poids du jour, sinon de la pesée la plus proche à <= maxDays (égalité -> antérieure). */
export function weightForDate(entries, date, maxDays = 3) {
  const same = entries.filter((e) => e.date === date)
  if (same.length) return latestWeight(same)
  let bestDate = null
  let bestGap = Infinity
  for (const e of entries) {
    const gap = Math.abs(dayGap(e.date, date))
    if (gap > maxDays) continue
    if (gap < bestGap || (gap === bestGap && e.date < bestDate)) {
      bestGap = gap
      bestDate = e.date
    }
  }
  if (bestDate === null) return null
  return latestWeight(entries.filter((e) => e.date === bestDate))
}

/** Photos triées ancien -> récent, avec poids associé. */
export function listPhotos(photosByDate, entries) {
  return Object.entries(photosByDate ?? {})
    .map(([date, photo]) => ({
      date,
      url: photo.url ?? null,
      storagePath: photo.storagePath,
      weight: weightForDate(entries ?? [], date),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** Photo la plus proche de targetIso (égalité -> la plus ancienne). */
export function nearestPhoto(photos, targetIso, { exclude } = {}) {
  let best = null
  let bestGap = Infinity
  for (const photo of photos) {
    if (exclude && photo.date === exclude) continue
    const gap = Math.abs(dayGap(photo.date, targetIso))
    if (gap < bestGap || (gap === bestGap && photo.date < best.date)) {
      best = photo
      bestGap = gap
    }
  }
  return best
}

const SHORTCUT_DAYS = { d30: 30, d7: 7 }

export function shortcutPair(photos, key, { today, challengeStartDate }) {
  if (!photos.length) return null
  if (photos.length === 1) {
    return key === 'start' ? { before: photos[0], after: null } : null
  }
  const after = photos[photos.length - 1]
  let before
  if (key === 'start') {
    before = (challengeStartDate && photos.find((p) => p.date >= challengeStartDate)) || photos[0]
  } else if (SHORTCUT_DAYS[key]) {
    const target = addDays(parseISO(today), -SHORTCUT_DAYS[key])
    before = nearestPhoto(photos, formatIso(target), {
      exclude: after.date,
    })
  } else {
    return null
  }
  if (!before || before.date === after.date) return null
  return { before, after }
}

function formatIso(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function availableShortcuts(photos, ctx) {
  return {
    start: shortcutPair(photos, 'start', ctx) !== null,
    d30: photos.length >= 2 && shortcutPair(photos, 'd30', ctx) !== null,
    d7: photos.length >= 2 && shortcutPair(photos, 'd7', ctx) !== null,
  }
}

/** Paire par défaut : Départ, sinon 30 jours, sinon première/dernière (jamais vide s'il y a des photos). */
export function defaultPair(photos, ctx) {
  return (
    shortcutPair(photos, 'start', ctx) ??
    shortcutPair(photos, 'd30', ctx) ??
    (photos.length >= 2
      ? { before: photos[0], after: photos[photos.length - 1] }
      : photos.length === 1
        ? { before: photos[0], after: null }
        : null)
  )
}

/** Raison d'un raccourci indisponible (infobulle), ou null s'il est disponible. */
export function shortcutDisabledReason(photos, key, ctx) {
  if (availableShortcuts(photos, ctx)[key]) return null
  if (key === 'start' && photos.length >= 2 && ctx.challengeStartDate) return 'Le défi vient de commencer'
  return 'Pas assez de photos'
}

/** Applique une sélection de slot en garantissant avant < après et deux photos distinctes. */
export function selectForSlot(pair, slot, photo, photos) {
  let before = slot === 'before' ? photo : pair.before
  let after = slot === 'after' ? photo : pair.after
  const other = slot === 'before' ? after : before
  if (other && other.date === photo.date) {
    const alt = nearestPhoto(photos, photo.date, { exclude: photo.date })
    if (!alt) {
      return slot === 'before'
        ? { before: photo, after: null }
        : { before: pair.before ?? photo, after: null }
    }
    if (slot === 'before') after = alt
    else before = alt
  }
  if (before && after && before.date > after.date) {
    ;[before, after] = [after, before]
  }
  return { before, after }
}

export function pairForJournalDate(photos, date, currentPair) {
  const photo = photos.find((p) => p.date === date)
  if (!photo) return null
  const first = photos[0]
  if (first.date === date) {
    const last = photos[photos.length - 1]
    return { before: photo, after: last.date === date ? null : last }
  }
  const keep = currentPair?.before && currentPair.before.date < date ? currentPair.before : first
  return { before: keep, after: photo }
}

export function pairStats(pair, { goalIsLoss }) {
  const { before, after } = pair
  if (!before) return { days: null, delta: null, isGood: null }
  const days = after ? dayGap(after.date, before.date) : null
  const hasWeights = after && before.weight != null && after.weight != null
  const delta = hasWeights ? Math.round((after.weight - before.weight) * 100) / 100 : null
  const isGood = delta === null || delta === 0 ? null : goalIsLoss ? delta < 0 : delta > 0
  return { days, delta, isGood }
}

export function groupByMonth(photos) {
  const groups = []
  for (const photo of photos) {
    const monthKey = photo.date.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.monthKey === monthKey) last.photos.push(photo)
    else groups.push({ monthKey, photos: [photo] })
  }
  return groups
}

/** Photo fantôme : celle du même jour (remplacement), sinon la plus récente antérieure. */
export function ghostFor(photos, date) {
  const same = photos.find((p) => p.date === date)
  if (same) return same
  const earlier = photos.filter((p) => p.date < date)
  return earlier.length ? earlier[earlier.length - 1] : null
}
