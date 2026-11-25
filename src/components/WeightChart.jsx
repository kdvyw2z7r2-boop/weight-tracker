import { useMemo } from 'react'
import { formatWeightWithUnit } from '../utils/format'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toChartLabel } from '../utils/weightPlan'
import { CHART_COLORS as C } from '../utils/chartColors'

function CustomTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="rounded-xl border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="text-[12px] text-text-tertiary">{point.date}</p>
      <p className="mt-0.5 text-sm font-semibold text-text-primary">
        {formatWeightWithUnit(point.weight, unit)}
      </p>
      {point.avg ? (
        <p className="mt-0.5 text-[12px] text-accent-green">Moy. : {formatWeightWithUnit(point.avg, unit)}</p>
      ) : null}
      {point.projected ? (
        <p className="mt-0.5 text-[12px] text-plan">Projection plan</p>
      ) : null}
    </div>
  )
}

function CheckpointMarker({ cx, cy }) {
  if (cx == null || cy == null) return null
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r={8} fill={C.card} stroke={C.plan} strokeWidth={1.5} />
      <text y={3} textAnchor="middle" fontSize={9}>
        🏁
      </text>
    </g>
  )
}

function WeightChart({ data, movingAverage, targetWeight, unit = 'kg', plan = null }) {
  const chartData = useMemo(() => {
    const historical = data.map((entry) => ({
      ...entry,
      avg: movingAverage.find((item) => item.date === entry.date)?.avg,
      label: toChartLabel(entry.date),
      projected: null,
      projection: null,
    }))

    if (!plan?.trajectory?.length) return historical

    const lastHistoricalDate = historical.at(-1)?.date
    const futurePoints = plan.trajectory
      .filter((point) => !lastHistoricalDate || point.date >= lastHistoricalDate)
      .map((point) => ({
        date: point.date,
        weight: null,
        avg: null,
        label: toChartLabel(point.date),
        projected: true,
        projection: point.weight,
      }))

    const merged = [...historical]
    futurePoints.forEach((point) => {
      const existing = merged.find((item) => item.date === point.date)
      if (existing) existing.projection = point.projection
      else merged.push(point)
    })

    return merged.sort((a, b) => (a.date > b.date ? 1 : -1))
  }, [data, movingAverage, plan])

  if (!chartData.length) {
    return (
      <div className="flex h-64 items-center justify-center text-[14px] text-text-tertiary">
        Pas encore de données pour cette période
      </div>
    )
  }

  const yMin = Math.min(
    ...chartData.map((item) => item.weight ?? item.projection ?? targetWeight).filter(Number.isFinite),
  )
  const yMax = Math.max(
    ...chartData.map((item) => item.weight ?? item.projection ?? targetWeight).filter(Number.isFinite),
  )

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.weight} stopOpacity={0.25} />
              <stop offset="100%" stopColor={C.weight} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={C.axis}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke={C.axis}
            tick={{ fontSize: 11 }}
            domain={[yMin - 1, yMax + 1]}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(v) => v.toString().replace('.', ',')}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
          {Number.isFinite(targetWeight) ? (
            <ReferenceLine
              y={targetWeight}
              stroke={C.axis}
              strokeDasharray="4 4"
              label={{ value: 'Objectif', position: 'insideTopRight', fill: C.axis, fontSize: 10 }}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="weight"
            stroke={C.weight}
            strokeWidth={2}
            fill="url(#weightGradient)"
            dot={{ r: 3, fill: C.weight, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: C.weight, stroke: C.text, strokeWidth: 2 }}
            animationDuration={800}
            animationEasing="ease-out"
            connectNulls={false}
          />
          {plan ? (
            <Line
              type="monotone"
              dataKey="projection"
              stroke={C.plan}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
              animationDuration={900}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="avg"
            stroke={C.avg}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
            animationDuration={900}
          />
          {plan?.checkpoints?.map((cp) => (
            <ReferenceDot
              key={cp.id ?? cp.date}
              x={cp.label ?? toChartLabel(cp.date)}
              y={cp.weight}
              shape={<CheckpointMarker />}
              ifOverflow="extendDomain"
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default WeightChart
