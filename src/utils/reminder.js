import { localIsoDate } from './dates'

function parseTime(reminderTime) {
  const match = /^(\d{2}):(\d{2})$/.exec(reminderTime ?? '')
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return { h, m }
}

/** Millisecondes jusqu'à reminderTime aujourd'hui ; null si déjà passée (ou invalide). */
export function msUntilReminder(now, reminderTime) {
  const t = parseTime(reminderTime)
  if (!t) return null
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), t.h, t.m, 0, 0)
  const diff = target.getTime() - now.getTime()
  return diff > 0 ? diff : null
}

/** Vrai si un rappel doit être affiché maintenant. */
export function shouldRemind({ now, reminderTime, enabled, hasEntryToday, lastRemindedDate }) {
  if (!enabled || hasEntryToday) return false
  if (parseTime(reminderTime) == null) return false
  if (msUntilReminder(now, reminderTime) != null) return false
  return lastRemindedDate !== localIsoDate(now)
}

/** Millisecondes jusqu'à la prochaine occurrence de reminderTime (aujourd'hui si pas passée, sinon demain). */
export function msUntilNextReminder(now, reminderTime) {
  const t = parseTime(reminderTime)
  if (!t) return null
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), t.h, t.m, 0, 0)
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}
