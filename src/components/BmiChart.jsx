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
import { CHART_COLORS as C } from '../utils/chartColors'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'

function BmiTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="glass-strong !rounded-xl px-3 py-2">
      <p className="text-[12px] text-text-secondary">{point.date}</p>
      <p className="mt-0.5 text-sm font-semibold text-text-primary">
        IMC : {String(point.bmi).replace('.', ',')}
      </p>
      {point.avg ? (
        <p className="mt-0.5 text-[12px] text-good-text">Moy. : {String(point.avg).replace('.', ',')}</p>
      ) : null}
    </div>
  )
}

function BmiChart({ data, movingAverage = [] }) {
  const reducedMotion = usePrefersReducedMotion()
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
      <div className="flex h-56 items-center justify-center text-[14px] text-text-secondary">
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
            domain={[Math.max(15, yMin - 1), yMax + 1]}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(value) => value.toString().replace('.', ',')}
          />
          <Tooltip content={<BmiTooltip />} cursor={{ stroke: C.grid }} />
          {BMI_ZONES.slice(1).map((zone) => (
            <ReferenceLine
              key={zone.label}
              y={zone.min}
              stroke={C.grid}
              strokeDasharray="3 3"
            />
          ))}
          <Area
            type="monotone"
            dataKey="bmi"
            stroke={C.weight}
            strokeWidth={2}
            fill="url(#bmiGradient)"
            dot={{ r: 3, fill: C.weight, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: C.weight, stroke: C.text, strokeWidth: 2 }}
            isAnimationActive={!reducedMotion}
            animationDuration={800}
            animationEasing="ease-out"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke={C.avg}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
            isAnimationActive={!reducedMotion}
            animationDuration={900}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default BmiChart
