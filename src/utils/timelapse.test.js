import { describe, expect, it } from 'vitest'
import { nextFrameIndex, prevFrameIndex } from './timelapse'

describe('nextFrameIndex', () => {
  it('avance d’une image', () => {
    expect(nextFrameIndex(0, 4)).toBe(1)
    expect(nextFrameIndex(2, 4)).toBe(3)
  })

  it('s’arrête sur la dernière image sans boucle', () => {
    expect(nextFrameIndex(3, 4)).toBe(3)
    expect(nextFrameIndex(3, 4, { loop: false })).toBe(3)
  })

  it('revient au début avec loop', () => {
    expect(nextFrameIndex(3, 4, { loop: true })).toBe(0)
  })

  it('gère une séquence vide ou un index hors bornes', () => {
    expect(nextFrameIndex(0, 0)).toBe(0)
    expect(nextFrameIndex(9, 4)).toBe(3)
  })
})

describe('prevFrameIndex', () => {
  it('recule et reste borné à 0', () => {
    expect(prevFrameIndex(2, 4)).toBe(1)
    expect(prevFrameIndex(0, 4)).toBe(0)
    expect(prevFrameIndex(0, 0)).toBe(0)
  })
})
