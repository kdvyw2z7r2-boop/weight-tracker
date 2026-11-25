import { describe, expect, test } from 'vitest'
import { daysAgoIso, localIsoDate } from './dates'
import { projectGoalDate } from './projection'

describe('projectGoalDate', () => {
  test('vitesse par jour, pas par pesée', () => {
    const e = [{ date: '2026-11-21', weight: 80 }, { date: '2026-11-01', weight: 82 }]
    expect(projectGoalDate(e, 78, new Date('2026-11-21')).ratePerDay).toBeCloseTo(-0.1)
    expect(projectGoalDate(e, 78, new Date('2026-11-21')).date).toBe('2026-12-11')
  })
  test('pas de projection si on s’éloigne de l’objectif ou < 2 pesées', () => {
    expect(projectGoalDate([{ date: '2026-11-01', weight: 80 }], 78).date).toBeNull()
    expect(projectGoalDate([{ date: '2026-11-10', weight: 81 }, { date: '2026-11-01', weight: 80 }], 78).date).toBeNull()
  })
  test('ignore les pesées hors fenêtre de 30 jours', () => {
    const e = [
      { date: '2026-11-21', weight: 80 },
      { date: '2026-11-01', weight: 82 },
      { date: '2026-06-01', weight: 60 },
    ]
    expect(projectGoalDate(e, 78).ratePerDay).toBeCloseTo(-0.1)
  })
  test('objectif déjà atteint : pas de date', () => {
    const e = [{ date: '2026-11-21', weight: 77 }, { date: '2026-11-01', weight: 79 }]
    expect(projectGoalDate(e, 78).date).toBeNull()
  })
})

describe('dates locales', () => {
  test('daysAgoIso est local', () => expect(daysAgoIso(0, new Date(2026, 10, 25, 23, 30))).toBe('2026-11-25'))
  test('daysAgoIso recule sur le mois précédent', () => expect(daysAgoIso(30, new Date(2026, 10, 25))).toBe('2026-10-26'))
  test('localIsoDate', () => expect(localIsoDate(new Date(2026, 0, 5, 0, 10))).toBe('2026-01-05'))
})
