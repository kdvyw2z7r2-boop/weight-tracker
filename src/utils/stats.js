import { format, startOfMonth, subDays } from 'date-fns'

export function getBmi(weight, heightCm) {
  if (!heightCm || !weight) return null
  const h = heightCm / 100
  return weight / (h * h)
}

export function getBmiCategory(bmi) {
  if (bmi == null || Number.isNaN(bmi)) {
    return { label: '--', colorClass: 'text-text-tertiary' }
  }
  if (bmi < 18.5) return { label: 'Maigreur', colorClass: 'text-accent-blue' }
  if (bmi < 25) return { label: 'Normal', colorClass: 'text-accent-green' }
  if (bmi < 30) return { label: 'Surpoids', colorClass: 'text-orange-400' }
  return { label: 'Obésité', colorClass: 'text-accent-red' }
}

export function hasEntryOnDate(entries, dateStr) {
  return entries.some((entry) => entry.date === dateStr)
}

export function getCurrentStreak(entries) {
  let streak = 0
  const cursor = new Date()
  while (hasEntryOnDate(entries, format(cursor, 'yyyy-MM-dd'))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function getLast7DaysStatus(entries) {
  const today = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const day = subDays(today, 6 - index)
    const dateStr = format(day, 'yyyy-MM-dd')
    return {
      date: dateStr,
      hasEntry: hasEntryOnDate(entries, dateStr),
      isToday: format(today, 'yyyy-MM-dd') === dateStr,
    }
  })
}

export function getLowestIn7Days(entries) {
  const cutoff = format(subDays(new Date(), 6), 'yyyy-MM-dd')
  const recent = entries.filter((entry) => entry.date >= cutoff)
  if (!recent.length) return null
  return Math.min(...recent.map((entry) => entry.weight))
}

export function getMonthVariation(entries) {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEntries = [...entries]
    .filter((entry) => entry.date >= monthStart)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
  if (monthEntries.length < 2) return null
  const first = monthEntries[0].weight
  const last = monthEntries[monthEntries.length - 1].weight
  return last - first
}
