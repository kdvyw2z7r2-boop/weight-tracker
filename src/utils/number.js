export function parseBoundedNumber(raw, { min, max }) {
  const text = String(raw ?? '').trim().replace(',', '.')
  if (text === '') return null
  const value = Number(text)
  if (!Number.isFinite(value) || value < min || value > max) return null
  return value
}

// Number to commit, or null when nothing should be saved (invalid, or unchanged
// from what the field displayed / from the stored value).
// `decimals` rounds the parsed value to the field's display precision so that
// what is stored equals what is shown.
export function resolveCommit(draft, { display, value, min, max, decimals }) {
  if (draft === display) return null
  const parsed = parseBoundedNumber(draft, { min, max })
  if (parsed === null) return null
  const next = decimals == null ? parsed : roundToDecimals(parsed, decimals)
  return next === Number(value) ? null : next
}

export function roundToDecimals(value, decimals) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
