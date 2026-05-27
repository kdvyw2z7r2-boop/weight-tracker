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
    </div>
  )
}

function WeightChart({ data, movingAverage, targetWeight, unit = 'kg' }) {
  const merged = data.map((entry) => ({
    ...entry,
    avg: movingAverage.find((item) => item.date === entry.date)?.avg,
    label: entry.date.slice(5).replace('-', '/'),
  }))

  if (!merged.length) {
    return (
      <div className="flex h-64 items-center justify-center text-[14px] text-text-tertiary">
        Pas encore de données pour cette période
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={merged} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
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
          />
          <YAxis
            stroke="#4B5563"
            tick={{ fontSize: 11 }}
            domain={['dataMin - 1', 'dataMax + 1']}
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

export default WeightChart
