import { localIsoDate } from './dates'

const WINDOW_DAYS = 30
const DAY_MS = 86400000

// Jours entiers entre deux dates 'yyyy-MM-dd' (calcul UTC : insensible au DST).
function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

function isoFromDayNumber(n) {
  const d = new Date(n * DAY_MS)
  return localIsoDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * Projection de la date d'atteinte de l'objectif.
 * Régression linéaire (moindres carrés) sur les pesées des 30 derniers jours
 * précédant la dernière pesée (inclus) ; vitesse en kg/jour.
 * Projection ancrée sur la dernière pesée (`now` n'est accepté que pour compatibilité d'API).
 * date = null si < 2 jours distincts, pente nulle, pente qui éloigne de l'objectif,
 * ou objectif déjà atteint.
 */
// eslint-disable-next-line no-unused-vars
export function projectGoalDate(entries, targetWeight, now = new Date()) {
  const none = { ratePerDay: null, date: null }
  if (!entries?.length) return none

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const latest = sorted.at(-1)
  const latestDay = dayNumber(latest.date)
  const windowed = sorted.filter((e) => latestDay - dayNumber(e.date) <= WINDOW_DAYS)
  if (windowed.length < 2) return none

  const x0 = dayNumber(windowed[0].date)
  const pts = windowed.map((e) => ({ x: dayNumber(e.date) - x0, y: e.weight }))
  const n = pts.length
  const meanX = pts.reduce((s, p) => s + p.x, 0) / n
  const meanY = pts.reduce((s, p) => s + p.y, 0) / n
  const sxx = pts.reduce((s, p) => s + (p.x - meanX) ** 2, 0)
  if (sxx === 0) return none
  const ratePerDay = pts.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0) / sxx

  const gap = targetWeight - latest.weight
  if (ratePerDay === 0 || gap === 0 || Math.sign(gap) !== Math.sign(ratePerDay)) {
    return { ratePerDay, date: null }
  }
  const days = Math.ceil(gap / ratePerDay)
  return { ratePerDay, date: isoFromDayNumber(latestDay + days) }
}
