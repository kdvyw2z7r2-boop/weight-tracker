import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'

export const PACE_MIN = 0.1
export const PACE_MAX = 0.9
export const PACE_RECOMMENDED_MIN = 0.25
export const PACE_RECOMMENDED_MAX = 0.6
export const DEFAULT_WEEKLY_PACE = 0.4

export function formatWeight(value, unit = 'kg') {
  if (value == null || Number.isNaN(value)) return '—'
  const formatted = Number(value).toFixed(1)
  return unit === 'kg' ? formatted.replace('.', ',') : formatted
}

export function formatPace(pace) {
  if (pace == null || Number.isNaN(pace)) return '—'
  return `${pace.toFixed(2).replace('.', ',')} kg/sem.`
}

export function computeWeightPlan({ startWeight, targetWeight, weeklyPace, startDate }) {
  if (!startWeight || !targetWeight || !weeklyPace || !startDate) return null

  const totalLoss = startWeight - targetWeight
  if (totalLoss <= 0) return null

  const totalWeeks = totalLoss / weeklyPace
  const totalDays = Math.ceil(totalWeeks * 7)
  const start = parseISO(startDate)
  const endDate = addDays(start, totalDays)

  const checkpointCount = Math.min(3, Math.max(1, Math.round(totalWeeks / 6)))
  const checkpoints = Array.from({ length: checkpointCount }, (_, index) => {
    const fraction = (index + 1) / (checkpointCount + 1)
    const weight = Number((startWeight - totalLoss * fraction).toFixed(1))
    const days = Math.round(totalDays * fraction)
    const date = addDays(start, days)
    return { id: index + 1, weight, date: date.toISOString().slice(0, 10), days, fraction }
  })

  const trajectory = buildTrajectory({ startWeight, targetWeight, startDate, endDate, checkpoints })

  return {
    startWeight,
    targetWeight,
    weeklyPace,
    startDate,
    endDate: endDate.toISOString().slice(0, 10),
    totalWeeks,
    totalDays,
    totalLoss,
    checkpoints,
    trajectory,
  }
}

function buildTrajectory({ startWeight, targetWeight, startDate, endDate, checkpoints }) {
  const milestones = [
    { date: startDate, weight: startWeight, type: 'start' },
    ...checkpoints.map((cp) => ({ date: cp.date, weight: cp.weight, type: 'checkpoint' })),
    { date: endDate.toISOString().slice(0, 10), weight: targetWeight, type: 'goal' },
  ]

  const points = []
  for (let i = 0; i < milestones.length - 1; i += 1) {
    const from = milestones[i]
    const to = milestones[i + 1]
    const segmentDays = Math.max(1, differenceInCalendarDays(parseISO(to.date), parseISO(from.date)))
    const steps = Math.min(12, Math.max(4, Math.round(segmentDays / 7)))
    for (let step = 0; step <= steps; step += 1) {
      const ratio = step / steps
      const date = addDays(parseISO(from.date), Math.round(segmentDays * ratio))
      const weight = Number((from.weight + (to.weight - from.weight) * ratio).toFixed(2))
      points.push({
        date: date.toISOString().slice(0, 10),
        weight,
        label: date.toISOString().slice(5).replace('-', '/'),
      })
    }
  }

  const seen = new Set()
  return points.filter((point) => {
    if (seen.has(point.date)) return false
    seen.add(point.date)
    return true
  })
}

export function getNextCheckpoint(plan, referenceDate = new Date()) {
  if (!plan?.checkpoints?.length) return null
  const ref = referenceDate.toISOString().slice(0, 10)
  return plan.checkpoints.find((cp) => cp.date >= ref) ?? plan.checkpoints.at(-1)
}

export function computeWeeklyRates(entries, plan) {
  if (!plan) return []

  const start = parseISO(plan.startDate)
  const weeks = []
  let weekStart = start

  while (weekStart <= parseISO(plan.endDate)) {
    const weekEnd = addDays(weekStart, 6)
    const weekEndIso = weekEnd.toISOString().slice(0, 10)
    const weekStartIso = weekStart.toISOString().slice(0, 10)

    const entriesInWeek = entries.filter((entry) => entry.date >= weekStartIso && entry.date <= weekEndIso)
    const latestInWeek = entriesInWeek[0]

    const daysFromStart = differenceInCalendarDays(weekStart, start)
    const expectedWeight = Number(
      (plan.startWeight - (daysFromStart / 7) * plan.weeklyPace).toFixed(1),
    )

    weeks.push({
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
      label: `${weekStartIso.slice(8, 10)}/${weekStartIso.slice(5, 7)} – ${weekEndIso.slice(8, 10)}/${weekEndIso.slice(5, 7)}/${weekEndIso.slice(2, 4)}`,
      actualWeight: latestInWeek?.weight ?? null,
      expectedWeight,
      rate: null,
    })

    weekStart = addDays(weekStart, 7)
    if (weeks.length >= 20) break
  }

  for (let i = 1; i < weeks.length; i += 1) {
    const prev = weeks[i - 1]
    const curr = weeks[i]
    if (prev.actualWeight != null && curr.actualWeight != null) {
      curr.rate = Number((prev.actualWeight - curr.actualWeight).toFixed(2))
    }
  }

  return weeks
}

export function computeActualRates(entries, startDate) {
  if (entries.length < 2 || !startDate) {
    return { currentRate: null, overallRate: null }
  }

  const sorted = [...entries].sort((a, b) => (a.date > b.date ? -1 : 1))
  const latest = sorted[0]
  const previous = sorted[1]
  const daysBetween = Math.max(1, differenceInCalendarDays(parseISO(latest.date), parseISO(previous.date)))
  const currentRate = Number(((previous.weight - latest.weight) / daysBetween * 7).toFixed(2))

  const first = sorted.at(-1)
  const totalDays = Math.max(1, differenceInCalendarDays(parseISO(latest.date), parseISO(first.date)))
  const overallRate = Number(((first.weight - latest.weight) / totalDays * 7).toFixed(2))

  return { currentRate, overallRate }
}
