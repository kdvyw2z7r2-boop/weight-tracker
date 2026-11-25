export function parseBoundedNumber(raw, { min, max }) {
  const text = String(raw ?? '').trim().replace(',', '.')
  if (text === '') return null
  const value = Number(text)
  if (!Number.isFinite(value) || value < min || value > max) return null
  return value
}
