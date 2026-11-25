import { describe, expect, it } from 'vitest'
import { msUntilReminder, shouldRemind } from './reminder'

const base = {
  now: new Date(2026, 10, 25, 9, 0, 0),
  reminderTime: '08:00',
  enabled: true,
  hasEntryToday: false,
  lastRemindedDate: null,
}

describe('shouldRemind', () => {
  it('false avant l\'heure', () => {
    expect(shouldRemind({ ...base, now: new Date(2026, 10, 25, 7, 59) })).toBe(false)
  })
  it('true après l\'heure', () => {
    expect(shouldRemind(base)).toBe(true)
  })
  it('true pile à l\'heure', () => {
    expect(shouldRemind({ ...base, now: new Date(2026, 10, 25, 8, 0, 0) })).toBe(true)
  })
  it('false si pesée du jour', () => {
    expect(shouldRemind({ ...base, hasEntryToday: true })).toBe(false)
  })
  it('false si déjà rappelé aujourd\'hui, true si rappelé hier', () => {
    expect(shouldRemind({ ...base, lastRemindedDate: '2026-11-25' })).toBe(false)
    expect(shouldRemind({ ...base, lastRemindedDate: '2026-11-24' })).toBe(true)
  })
  it('false si désactivé', () => {
    expect(shouldRemind({ ...base, enabled: false })).toBe(false)
  })
  it('false si heure invalide', () => {
    expect(shouldRemind({ ...base, reminderTime: 'abc' })).toBe(false)
    expect(shouldRemind({ ...base, reminderTime: '25:00' })).toBe(false)
    expect(shouldRemind({ ...base, reminderTime: null })).toBe(false)
  })
})

describe('msUntilReminder', () => {
  it('délai jusqu\'à l\'heure du jour', () => {
    expect(msUntilReminder(new Date(2026, 10, 25, 7, 0, 0), '08:00')).toBe(3600000)
  })
  it('null si l\'heure est passée ou atteinte', () => {
    expect(msUntilReminder(new Date(2026, 10, 25, 8, 0, 0), '08:00')).toBeNull()
    expect(msUntilReminder(new Date(2026, 10, 25, 9, 0, 0), '08:00')).toBeNull()
  })
  it('null si heure invalide', () => {
    expect(msUntilReminder(new Date(2026, 10, 25, 7, 0, 0), 'x')).toBeNull()
  })
})
