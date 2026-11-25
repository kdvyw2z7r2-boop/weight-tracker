export function parseBoundedNumber(raw, { min, max }) {
  const text = String(raw ?? '').trim().replace(',', '.')
  if (text === '') return null
  const value = Number(text)
  if (!Number.isFinite(value) || value < min || value > max) return null
  return value
}

// Number to commit, or null when nothing should be saved (invalid, or unchanged
// from what the field displayed / from the stored value).
export function resolveCommit(draft, { display, value, min, max }) {
  if (draft === display) return null
  const parsed = parseBoundedNumber(draft, { min, max })
  if (parsed === null || parsed === Number(value)) return null
  return parsed
}
