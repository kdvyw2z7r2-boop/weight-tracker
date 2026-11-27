import { describe, expect, it } from 'vitest'
import { nextSegmentIndex, tabStopIndex } from './segmented'

describe('nextSegmentIndex (radiogroup WAI-ARIA)', () => {
  it('flèches droite/bas : suivant, avec bouclage', () => {
    expect(nextSegmentIndex('ArrowRight', 0, 3)).toBe(1)
    expect(nextSegmentIndex('ArrowDown', 1, 3)).toBe(2)
    expect(nextSegmentIndex('ArrowRight', 2, 3)).toBe(0)
  })

  it('flèches gauche/haut : précédent, avec bouclage', () => {
    expect(nextSegmentIndex('ArrowLeft', 2, 3)).toBe(1)
    expect(nextSegmentIndex('ArrowUp', 1, 3)).toBe(0)
    expect(nextSegmentIndex('ArrowLeft', 0, 3)).toBe(2)
  })

  it('Home/End : premier/dernier', () => {
    expect(nextSegmentIndex('Home', 2, 4)).toBe(0)
    expect(nextSegmentIndex('End', 0, 4)).toBe(3)
  })

  it('autres touches ou liste vide : null', () => {
    expect(nextSegmentIndex('Enter', 0, 3)).toBeNull()
    expect(nextSegmentIndex('a', 0, 3)).toBeNull()
    expect(nextSegmentIndex('ArrowRight', 0, 0)).toBeNull()
  })

  it('index courant absent (-1) : flèche droite → premier, gauche → dernier', () => {
    expect(nextSegmentIndex('ArrowRight', -1, 3)).toBe(0)
    expect(nextSegmentIndex('ArrowLeft', -1, 3)).toBe(2)
  })
})

describe('tabStopIndex (roving tabindex)', () => {
  it("l'option cochée porte le seul tabindex 0", () => {
    expect(tabStopIndex(['a', 'b', 'c'], 'b')).toBe(1)
  })

  it('aucune option cochée : la première reste atteignable au clavier', () => {
    expect(tabStopIndex(['a', 'b'], 'zzz')).toBe(0)
  })
})
