import { describe, expect, it } from 'vitest'
import { normalizeUserId } from './useUserId'

describe('normalizeUserId', () => {
  it('accepte un code seul, espaces compris', () => {
    expect(normalizeUserId('  user_c63e545689574079895c715ce2796292 ')).toBe('user_c63e545689574079895c715ce2796292')
  })
  it('extrait le code d’un lien', () => {
    expect(normalizeUserId('https://exemple.app/?id=user_abc123&x=1')).toBe('user_abc123')
  })
  it('refuse un texte invalide', () => {
    expect(normalizeUserId('')).toBeNull()
    expect(normalizeUserId('pas un code !')).toBeNull()
    expect(normalizeUserId('ab')).toBeNull()
  })
})
