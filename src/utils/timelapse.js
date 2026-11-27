/** Cadence du défilé : 4 images par seconde. */
export const FRAME_INTERVAL_MS = 250

/**
 * Index de l'image suivante. En fin de séquence : reste sur la dernière image,
 * ou revient à la première avec `loop`.
 */
export function nextFrameIndex(index, length, { loop = false } = {}) {
  if (length <= 0) return 0
  if (index >= length - 1) return loop ? 0 : length - 1
  return Math.max(0, index + 1)
}

/** Index de l'image précédente (borné à la première image). */
export function prevFrameIndex(index, length) {
  if (length <= 0) return 0
  return Math.min(Math.max(index - 1, 0), length - 1)
}
