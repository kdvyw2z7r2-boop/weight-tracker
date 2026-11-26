import { localIsoDate } from './dates'

export function todayIso() {
  return localIsoDate(new Date())
}

/** Pesées du défi en cours (tri d'origine conservé). Sans date de défi : toutes les pesées. */
export function getChallengeEntries(entries, challengeStartDate) {
  if (!challengeStartDate) return entries
  return entries.filter((entry) => entry.date >= challengeStartDate)
}

/**
 * Pesée d'ancrage du défi (règle unique pour l'anneau et le plan) :
 * 1re pesée à la date ou après, sinon la plus récente avant. Sans date : 1re pesée tout court.
 */
export function findChallengeAnchor(entries, date) {
  let firstOnOrAfter = null
  let latestBefore = null
  for (const entry of entries ?? []) {
    if (!date || entry.date >= date) {
      if (!firstOnOrAfter || entry.date < firstOnOrAfter.date) firstOnOrAfter = entry
    } else if (!latestBefore || entry.date > latestBefore.date) {
      latestBefore = entry
    }
  }
  return firstOnOrAfter ?? latestBefore
}

/**
 * Point de départ du défi : { startDate, startWeight } ou null.
 * Poids = pesée d'ancrage (findChallengeAnchor), sinon poids mémorisé au reset.
 */
export function resolveChallengeStart(settings, entries) {
  const startDate = settings?.challengeStartDate ?? null
  const anchor = findChallengeAnchor(entries, startDate)

  if (anchor) return { startDate: startDate ?? anchor.date, startWeight: anchor.weight }
  if (startDate && settings?.challengeStartWeight != null) {
    return { startDate, startWeight: settings.challengeStartWeight }
  }
  return null
}

/**
 * Patch de settings pour redémarrer le défi à `date`.
 * Poids de départ = pesée d'ancrage (même règle que l'anneau). Le plan (s'il existe) part de `date` à ce poids.
 */
export function buildChallengeResetPatch(entries, date = todayIso(), settings = {}) {
  const startWeight = findChallengeAnchor(entries, date)?.weight ?? null

  const patch = { challengeStartDate: date, challengeStartWeight: startWeight }
  if (settings.weeklyPace != null && startWeight != null) {
    patch.planStartDate = date
    patch.planStartWeight = startWeight
  }
  return patch
}

/**
 * Patch de settings pour reprendre le défi depuis la toute première pesée.
 * Le plan (s'il existe) est ré-ancré sur cette même première pesée.
 */
export function buildChallengeRestorePatch(entries, settings = {}) {
  const patch = { challengeStartDate: null, challengeStartWeight: null }
  const origin = resolveChallengeStart({}, entries)
  if (settings.weeklyPace != null && origin) {
    patch.planStartDate = origin.startDate
    patch.planStartWeight = origin.startWeight
  }
  return patch
}
