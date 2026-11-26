import { describe, expect, it } from 'vitest'
import { parseBoundedNumber, resolveCommit, roundToDecimals } from './number'

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

describe('resolveCommit', () => {
  const b = { min: 30, max: 550 }
  it('ne valide pas si le brouillon est inchangé par rapport à l\'affichage', () => {
    expect(resolveCommit('159,8', { display: '159,8', value: 159.83, ...b })).toBeNull()
  })
  it('valide une vraie modification', () => {
    expect(resolveCommit('160', { display: '159,8', value: 159.83, ...b })).toBe(160)
  })
  it('ne valide pas si la valeur parsée est égale à la valeur', () => {
    expect(resolveCommit('72,5', { display: '72,5', value: 72.5, ...b })).toBeNull()
    expect(resolveCommit('72.50', { display: '72,5', value: 72.5, ...b })).toBeNull()
  })
  it('ne valide pas hors bornes ou vide', () => {
    expect(resolveCommit('', { display: '72,5', value: 72.5, ...b })).toBeNull()
    expect(resolveCommit('900', { display: '72,5', value: 72.5, ...b })).toBeNull()
  })
})

describe('roundToDecimals', () => {
  it('arrondit à la précision demandée', () => {
    expect(roundToDecimals(72.46, 1)).toBe(72.5)
    expect(roundToDecimals(180.4, 0)).toBe(180)
    expect(roundToDecimals(180.5, 0)).toBe(181)
  })
})

describe('resolveCommit avec decimals', () => {
  const b = { min: 120, max: 230 }
  it('arrondit à l\'entier pour la taille', () => {
    expect(resolveCommit('180,6', { display: '180', value: 180, decimals: 0, ...b })).toBe(181)
  })
  it('arrondit à 1 décimale pour le poids', () => {
    expect(resolveCommit('72,46', { display: '72,0', value: 72, min: 30, max: 250, decimals: 1 })).toBe(72.5)
  })
  it('ne valide pas si l\'arrondi égale la valeur stockée', () => {
    expect(resolveCommit('180,2', { display: '180', value: 180, decimals: 0, ...b })).toBeNull()
  })
})
