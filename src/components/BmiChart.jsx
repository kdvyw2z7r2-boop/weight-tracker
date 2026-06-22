import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BMI_ZONES } from '../utils/stats'

function BmiTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="rounded-xl border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="text-[12px] text-text-tertiary">{point.date}</p>
      <p className="mt-0.5 text-sm font-semibold text-text-primary">
        IMC : {String(point.bmi).replace('.', ',')}
      </p>
      {point.avg ? (
        <p className="mt-0.5 text-[12px] text-accent-green">Moy. : {String(point.avg).replace('.', ',')}</p>
      ) : null}
    </div>
  )
}

function BmiChart({ data, movingAverage = [] }) {
  const chartData = useMemo(
    () =>
      data.map((entry) => ({
        ...entry,
        avg: movingAverage.find((item) => item.date === entry.date)?.avg ?? null,
      })),
    [data, movingAverage],
  )

  if (!chartData.length) {
    return (
      <div className="flex h-56 items-center justify-center text-[14px] text-text-tertiary">
        Pas encore de données pour cette période
      </div>
    )
  }

  const values = chartData.flatMap((item) => [item.bmi, item.avg]).filter(Number.isFinite)
  const yMin = Math.min(...values)
  const yMax = Math.max(...values)

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bmiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(56,189,248,0.25)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
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
            domain={[Math.max(15, yMin - 1), yMax + 1]}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(value) => value.toString().replace('.', ',')}
          />
          <Tooltip content={<BmiTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
          {BMI_ZONES.slice(1).map((zone) => (
            <ReferenceLine
              key={zone.label}
              y={zone.min}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="3 3"
            />
          ))}
          <Area
            type="monotone"
            dataKey="bmi"
            stroke="#38BDF8"
            strokeWidth={2}
            fill="url(#bmiGradient)"
            dot={{ r: 3, fill: '#38BDF8', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#38BDF8', stroke: '#fff', strokeWidth: 2 }}
            animationDuration={800}
            animationEasing="ease-out"
            connectNulls={false}
          />
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
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default BmiChart
