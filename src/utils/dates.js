/** Date locale (pas UTC) au format 'yyyy-MM-dd'. */
export function localIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Date locale d'il y a `n` jours, au format 'yyyy-MM-dd'. */
export function daysAgoIso(n, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n)
  return localIsoDate(d)
}
