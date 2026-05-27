import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export { fr }

export function formatDateLong(date = new Date()) {
  return format(date, 'EEEE d MMMM', { locale: fr })
}

export function formatDateShort(isoDate) {
  return format(parseISO(isoDate), 'd MMM yyyy', { locale: fr })
}

export function formatDateEntry(isoDate) {
  return format(parseISO(isoDate), 'd MMMM yyyy', { locale: fr })
}

export function formatMonthYear(monthKey) {
  return format(parseISO(`${monthKey}-01`), 'MMMM yyyy', { locale: fr }).toUpperCase()
}
