import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export const PACE_MIN = 0.1
export const PACE_MAX = 0.9
export const PACE_RECOMMENDED_MIN = 0.25
export const PACE_RECOMMENDED_MAX = 0.6
export const DEFAULT_WEEKLY_PACE = 0.4

export function toIsoDate(date) {
  return format(date, 'yyyy-MM-dd')
}

export function toChartLabel(isoDate) {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

export function resolvePlanAnchor(settings, entries) {
  if (settings.planStartDate && settings.planStartWeight != null) {
    return {
      startDate: settings.planStartDate,
      startWeight: settings.planStartWeight,
    }
  }

  const latest = entries?.[0]
  if (!latest) return null

  return {
    startDate: latest.date,
    startWeight: latest.weight,
  }
}

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
  const endDateIso = toIsoDate(endDate)

  const checkpointCount = Math.min(3, Math.max(1, Math.round(totalWeeks / 6)))
  const checkpoints = Array.from({ length: checkpointCount }, (_, index) => {
    const fraction = (index + 1) / (checkpointCount + 1)
    const weight = Number((startWeight - totalLoss * fraction).toFixed(1))
    const days = Math.round(totalDays * fraction)
    const date = toIsoDate(addDays(start, days))
    return { id: index + 1, weight, date, days, fraction, label: toChartLabel(date) }
  })

  const trajectory = buildTrajectory({ startWeight, targetWeight, startDate, endDateIso, checkpoints })

  return {
    startWeight,
    targetWeight,
    weeklyPace,
    startDate,
    endDate: endDateIso,
    totalWeeks,
    totalDays,
    totalLoss,
    checkpoints,
    trajectory,
  }
}

function buildTrajectory({ startWeight, targetWeight, startDate, endDateIso, checkpoints }) {
  const milestones = [
    { date: startDate, weight: startWeight, type: 'start' },
    ...checkpoints.map((cp) => ({ date: cp.date, weight: cp.weight, type: 'checkpoint' })),
    { date: endDateIso, weight: targetWeight, type: 'goal' },
  ]

  const points = []
  for (let i = 0; i < milestones.length - 1; i += 1) {
    const from = milestones[i]
    const to = milestones[i + 1]
    const segmentDays = Math.max(1, differenceInCalendarDays(parseISO(to.date), parseISO(from.date)))
    const steps = Math.min(12, Math.max(4, Math.round(segmentDays / 7)))
    for (let step = 0; step <= steps; step += 1) {
      const ratio = step / steps
      const date = toIsoDate(addDays(parseISO(from.date), Math.round(segmentDays * ratio)))
      const weight = Number((from.weight + (to.weight - from.weight) * ratio).toFixed(2))
      points.push({
        date,
        weight,
        label: toChartLabel(date),
      })
    }
  }

  milestones.forEach((milestone) => {
    if (!points.some((point) => point.date === milestone.date)) {
      points.push({
        date: milestone.date,
        weight: milestone.weight,
        label: toChartLabel(milestone.date),
      })
    }
  })

  const seen = new Set()
  return points
    .filter((point) => {
      if (seen.has(point.date)) return false
      seen.add(point.date)
      return true
    })
    .sort((a, b) => (a.date > b.date ? 1 : -1))
}

export function getNextCheckpoint(plan, referenceDate = new Date()) {
  if (!plan?.checkpoints?.length) return null
  const ref = toIsoDate(referenceDate)
  return plan.checkpoints.find((cp) => cp.date >= ref) ?? plan.checkpoints.at(-1)
}

export function computeWeeklyRates(entries, plan) {
  if (!plan) return []

  const start = parseISO(plan.startDate)
  const weeks = []
  let weekStart = start

  while (weekStart <= parseISO(plan.endDate)) {
    const weekEnd = addDays(weekStart, 6)
    const weekEndIso = toIsoDate(weekEnd)
    const weekStartIso = toIsoDate(weekStart)

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
