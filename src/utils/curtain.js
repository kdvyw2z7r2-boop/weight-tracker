export function clampPercent(value) {
  if (!Number.isFinite(value)) return 50
  return Math.min(100, Math.max(0, value))
}

export function percentFromPointer(clientX, rectLeft, rectWidth) {
  if (!(rectWidth > 0)) return 50
  return clampPercent(((clientX - rectLeft) / rectWidth) * 100)
}
