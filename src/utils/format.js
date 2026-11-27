const NBSP = ' '

const formatDecimal = (value, digits) => Number(value).toFixed(digits).replace('.', ',')

const isMissing = (value) => value == null || Number.isNaN(Number(value))

export function formatWeight(value) {
  if (isMissing(value)) return '—'
  return formatDecimal(value, 1)
}

export function formatWeightWithUnit(value, unit = 'kg') {
  if (isMissing(value)) return '—'
  return `${formatWeight(value)}${NBSP}${unit}`
}

export function formatPace(pace, unit = 'kg') {
  if (isMissing(pace)) return '—'
  return `${formatDecimal(pace, 2)} ${unit}/sem.`
}

export function formatDays(days) {
  return `${days} jour${Math.abs(days) > 1 ? 's' : ''}`
}

/** « −5,2 kg » / « +1,5 kg » ; « — » si l'écart est inconnu. */
export function formatDelta(delta, unit = 'kg') {
  if (isMissing(delta)) return '—'
  const sign = delta < 0 ? '−' : delta > 0 ? '+' : ''
  return `${sign}${formatWeightWithUnit(Math.abs(delta), unit)}`
}
