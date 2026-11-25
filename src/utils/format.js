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
