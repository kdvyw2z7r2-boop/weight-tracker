import { describe, expect, it } from 'vitest'
import { composite, contrastRatio, parseColor, relativeLuminance } from './contrast'
import { readFileSync } from 'node:fs'

// Source unique : les valeurs sont lues dans index.css (@theme static).
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const token = (name) => css.match(new RegExp(`--color-${name}:\\s*([^;]+);`))?.[1].trim()
const TEXT_TOKENS = Object.fromEntries(
  ['text-primary', 'text-secondary', 'text-tertiary'].map((n) => [n, token(n)]),
)

describe('contrast helpers', () => {
  it('relativeLuminance: noir 0, blanc 1', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0)
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5)
  })

  it('contrastRatio: noir/blanc = 21', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5)
  })

  it('composite: alpha 0.5 blanc sur noir', () => {
    expect(composite([255, 255, 255, 0.5], [0, 0, 0])).toEqual([127.5, 127.5, 127.5])
  })

  it('parseColor: hex et rgba', () => {
    expect(parseColor('#05070f')).toEqual([5, 7, 15, 1])
    expect(parseColor('rgba(235,240,255,.62)')).toEqual([235, 240, 255, 0.62])
  })
})

describe('tokens texte sur le verre (≥ 4.5:1)', () => {
  // Verre = blanc 14 % (haut du dégradé + reflet) posé sur le fond ou sur le pic de chaque halo.
  const glass = [255, 255, 255, 0.14]
  const bgPrimary = parseColor(token('bg-primary'))
  const rootVar = (name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim()
  const backdrops = {
    'fond bg-primary': bgPrimary,
    'halo #1a3a8f (brief)': parseColor('#1a3a8f'),
    ...Object.fromEntries(
      ['halo-1', 'halo-2', 'halo-3'].map((n) => [n, composite(parseColor(rootVar(n)), bgPrimary)]),
    ),
  }

  it('les tokens et halos sont bien lus dans index.css', () => {
    expect(Object.values(TEXT_TOKENS).every(Boolean)).toBe(true)
    expect(['halo-1', 'halo-2', 'halo-3'].every((n) => rootVar(n))).toBe(true)
  })

  for (const [bgName, backdrop] of Object.entries(backdrops)) {
    const surface = composite(glass, backdrop)
    for (const [name, value] of Object.entries(TEXT_TOKENS)) {
      it(`${name} sur verre / ${bgName}`, () => {
        const fg = composite(parseColor(value), surface)
        expect(contrastRatio(fg, surface)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})
