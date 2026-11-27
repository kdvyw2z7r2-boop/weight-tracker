// Contraste WCAG 2.x : luminance relative, ratio, composition alpha.
// Couleurs en tableaux [r, g, b] (0–255) ou [r, g, b, a] (a 0–1).

export function parseColor(value) {
  const v = value.trim()
  const hex = v.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const fn = v.match(/^rgba?\(([^)]+)\)$/i)
  if (fn) {
    const [r, g, b, a = '1'] = fn[1].split(',').map((p) => p.trim())
    return [Number(r), Number(g), Number(b), Number(a)]
  }
  throw new Error(`Couleur non reconnue : ${value}`)
}

const channel = (c) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Compose une couleur rgba sur un fond opaque rgb. */
export function composite([r, g, b, a = 1], [br, bg, bb]) {
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)]
}
