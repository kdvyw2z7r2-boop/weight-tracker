import { useMemo } from 'react'
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

function CustomTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="rounded-xl border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="text-[12px] text-text-tertiary">{point.date}</p>
      <p className="mt-0.5 text-sm font-semibold text-text-primary">
        {point.weight} {unit}
      </p>
      {point.avg ? (
        <p className="mt-0.5 text-[12px] text-accent-green">Moy. : {point.avg} {unit}</p>
      ) : null}
      {point.projected ? (
        <p className="mt-0.5 text-[12px] text-[#A78BFA]">Projection plan</p>
      ) : null}
    </div>
  )
}

function CheckpointMarker({ cx, cy }) {
  if (cx == null || cy == null) return null
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r={8} fill="#141414" stroke="#A78BFA" strokeWidth={1.5} />
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
      label: entry.date.slice(5).replace('-', '/'),
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
        label: point.date.slice(5).replace('-', '/'),
        projected: true,
        projection: point.weight,
      }))

    const merged = [...historical]
    futurePoints.forEach((point) => {
      if (!merged.some((item) => item.date === point.date)) {
        merged.push(point)
      }
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
              <stop offset="0%" stopColor="rgba(96,165,250,0.25)" />
              <stop offset="100%" stopColor="rgba(96,165,250,0)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#4B5563"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#4B5563"
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
              stroke="#4B5563"
              strokeDasharray="4 4"
              label={{ value: 'Objectif', position: 'insideTopRight', fill: '#4B5563', fontSize: 10 }}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="weight"
            stroke="#60A5FA"
            strokeWidth={2}
            fill="url(#weightGradient)"
            dot={{ r: 3, fill: '#60A5FA', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#60A5FA', stroke: '#fff', strokeWidth: 2 }}
            animationDuration={800}
            animationEasing="ease-out"
            connectNulls={false}
          />
          {plan ? (
            <Line
              type="monotone"
              dataKey="projection"
              stroke="#A78BFA"
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
            stroke="#4ADE80"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
            animationDuration={900}
          />
          {plan?.checkpoints?.map((cp) => {
            const label = cp.date.slice(5).replace('-', '/')
            return (
              <ReferenceDot
                key={cp.id ?? cp.date}
                x={label}
                y={cp.weight}
                shape={<CheckpointMarker />}
                ifOverflow="extendDomain"
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default WeightChart
