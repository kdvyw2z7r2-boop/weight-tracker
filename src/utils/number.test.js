import { describe, expect, it } from 'vitest'
import { parseBoundedNumber } from './number'

const bounds = { min: 30, max: 250 }

describe('parseBoundedNumber', () => {
  it('accepte la virgule et le point', () => {
    expect(parseBoundedNumber('72,5', bounds)).toBe(72.5)
    expect(parseBoundedNumber('72.5', bounds)).toBe(72.5)
  })
  it('ignore les espaces autour', () => {
    expect(parseBoundedNumber(' 180 ', bounds)).toBe(180)
  })
  it('retourne null si vide ou non numérique', () => {
    expect(parseBoundedNumber('', bounds)).toBeNull()
    expect(parseBoundedNumber('   ', bounds)).toBeNull()
    expect(parseBoundedNumber('abc', bounds)).toBeNull()
  })
  it('retourne null hors bornes', () => {
    expect(parseBoundedNumber('29,9', bounds)).toBeNull()
    expect(parseBoundedNumber('250,1', bounds)).toBeNull()
  })
  it('bornes inclusives', () => {
    expect(parseBoundedNumber('30', bounds)).toBe(30)
    expect(parseBoundedNumber('250', bounds)).toBe(250)
  })
})
