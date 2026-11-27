import { describe, expect, it } from 'vitest'
import { buildShareCaption, shareLayout } from './shareImage'

const inside = (r, w, h) => r.x >= 0 && r.y >= 0 && r.x + r.width <= w && r.y + r.height <= h
const overlap = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

describe('shareLayout', () => {
  const { before, after, caption } = shareLayout({ width: 1080, height: 960 })

  it('reste dans les bornes', () => {
    for (const r of [before, after, caption]) expect(inside(r, 1080, 960)).toBe(true)
  })

  it('images au ratio 9:16 (±1 px)', () => {
    for (const r of [before, after]) expect(Math.abs(r.width / r.height - 9 / 16) * r.height).toBeLessThanOrEqual(1)
  })

  it('pas de chevauchement, avant à gauche, centré, légende en bas', () => {
    expect(overlap(before, after)).toBe(false)
    expect(overlap(before, caption)).toBe(false)
    expect(overlap(after, caption)).toBe(false)
    expect(before.x).toBeLessThan(after.x)
    expect(before.x + (after.x + after.width - before.x) / 2).toBeCloseTo(540, 0)
    expect(caption.y).toBeGreaterThanOrEqual(before.y + before.height)
  })
})

describe('buildShareCaption', () => {
  it('perte', () => expect(buildShareCaption({ delta: -5.2, days: 46 }, 'kg')).toBe('−5,2\u00a0kg en 46 jours'))
  it('gain', () => expect(buildShareCaption({ delta: 1.5, days: 10 }, 'kg')).toBe('+1,5\u00a0kg en 10 jours'))
  it('sans delta', () => expect(buildShareCaption({ delta: null, days: 1 }, 'kg')).toBe('1 jour'))
})
