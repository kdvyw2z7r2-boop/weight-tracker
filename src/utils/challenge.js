import { format } from 'date-fns'

export function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Pesées du défi en cours (tri d'origine conservé). Sans date de défi : toutes les pesées. */
export function getChallengeEntries(entries, challengeStartDate) {
  if (!challengeStartDate) return entries
  return entries.filter((entry) => entry.date >= challengeStartDate)
}

/**
 * Point de départ du défi : { startDate, startWeight } ou null.
 * Priorité : 1re pesée ≥ date du défi, sinon poids mémorisé au reset, sinon 1re pesée tout court.
 */
export function resolveChallengeStart(settings, entries) {
  const startDate = settings?.challengeStartDate ?? null
  const inChallenge = getChallengeEntries(entries ?? [], startDate)
  const first = inChallenge.reduce((acc, entry) => (!acc || entry.date < acc.date ? entry : acc), null)

  if (first) return { startDate: startDate ?? first.date, startWeight: first.weight }
  if (startDate && settings?.challengeStartWeight != null) {
    return { startDate, startWeight: settings.challengeStartWeight }
  }
  return null
}

/**
 * Patch de settings pour redémarrer le défi à `date`.
 * Poids de départ = pesée du jour choisi, sinon la plus récente avant, sinon la plus récente.
 * Le plan de poids (s'il existe) est ré-ancré sur ce même point.
 */
export function buildChallengeResetPatch(entries, date = todayIso(), settings = {}) {
  const sorted = [...(entries ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1))
  const anchor = sorted.find((entry) => entry.date <= date) ?? sorted[0] ?? null
  const startWeight = anchor?.weight ?? null

  const patch = { challengeStartDate: date, challengeStartWeight: startWeight }
  if (settings.weeklyPace != null && startWeight != null) {
    patch.planStartDate = date
    patch.planStartWeight = startWeight
  }
  return patch
}
