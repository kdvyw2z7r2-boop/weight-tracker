import { format, startOfMonth, subDays } from 'date-fns'
import { toChartLabel } from './weightPlan'

const LBS_TO_KG = 2.20462

export const BMI_ZONES = [
  { label: 'Maigreur', min: 0, max: 18.5, color: '#38BDF8' },
  { label: 'Normal', min: 18.5, max: 25, color: '#4ADE80' },
  { label: 'Surpoids', min: 25, max: 30, color: '#FBBF24' },
  { label: 'Obésité', min: 30, max: 40, color: '#F87171' },
]

export const BMI_GAUGE_MAX = 40

function toKg(weight, unit = 'kg') {
  if (!Number.isFinite(weight)) return null
  return unit === 'lbs' ? weight / LBS_TO_KG : weight
}

export function getBmi(weight, heightCm, unit = 'kg') {
  if (!heightCm || !weight) return null
  const weightKg = toKg(weight, unit)
  if (weightKg == null) return null
  const h = heightCm / 100
  return weightKg / (h * h)
}

export function getBmiMarkerPercent(bmi, gaugeMax = BMI_GAUGE_MAX) {
  if (bmi == null || Number.isNaN(bmi)) return 0
  return Math.max(0, Math.min(100, (bmi / gaugeMax) * 100))
}

export function getBmiZoneWidths(gaugeMax = BMI_GAUGE_MAX) {
  return BMI_ZONES.map((zone) => ({
    ...zone,
    widthPercent: ((zone.max - zone.min) / gaugeMax) * 100,
  }))
}

export function getBmiHistory(entries, heightCm, unit = 'kg') {
  if (!heightCm || !entries?.length) return []

  return [...entries]
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((entry) => {
      const bmi = getBmi(entry.weight, heightCm, unit)
      if (bmi == null) return null
      return {
        date: entry.date,
        label: toChartLabel(entry.date),
        bmi: Number(bmi.toFixed(1)),
      }
    })
    .filter(Boolean)
}

export function getBmiStats(entries, heightCm, unit = 'kg') {
  const history = getBmiHistory(entries, heightCm, unit)
  if (!history.length) {
    return { current: null, min: null, max: null, avg: null, delta: null, count: 0 }
  }

  const values = history.map((point) => point.bmi)
  const current = values.at(-1)
  const oldest = values[0]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length
  const delta = values.length > 1 ? current - oldest : null

  return {
    current,
    min,
    max,
    avg: Number(avg.toFixed(1)),
    delta: delta != null ? Number(delta.toFixed(1)) : null,
    count: history.length,
  }
}

export function getBmiMovingAverage(history, windowSize = 7) {
  if (!history?.length) return []

  return history.map((entry, index) => {
    const window = history.slice(Math.max(0, index - windowSize + 1), index + 1)
    const avg = window.reduce((sum, item) => sum + item.bmi, 0) / window.length
    return { date: entry.date, avg: Number(avg.toFixed(1)) }
  })
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
