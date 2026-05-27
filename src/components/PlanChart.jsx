import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDatePlanShort } from '../utils/locale'
import { formatWeight } from '../utils/weightPlan'

function CheckpointDot({ cx, cy }) {
  if (cx == null || cy == null) return null
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r={10} fill="#141414" stroke="#A78BFA" strokeWidth={2} />
      <text y={4} textAnchor="middle" fontSize={11}>
        🏁
      </text>
    </g>
  )
}

function GoalDot({ cx, cy }) {
  if (cx == null || cy == null) return null
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r={10} fill="#141414" stroke="#FBBF24" strokeWidth={2} />
      <text y={4} textAnchor="middle" fontSize={10}>
        🏆
      </text>
    </g>
  )
}

function StartDot({ cx, cy }) {
  if (cx == null || cy == null) return null
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r={10} fill="#141414" stroke="#A78BFA" strokeWidth={2} />
      <circle r={4} fill="#A78BFA" />
    </g>
  )
}

function PlanChart({ plan, unit = 'kg', compact = false }) {
  if (!plan?.trajectory?.length) {
    return (
      <div className="flex h-52 items-center justify-center text-[14px] text-text-tertiary">
        Configurez votre rythme pour voir le plan
      </div>
    )
  }

  const data = plan.trajectory
  const yMin = Math.min(plan.targetWeight, plan.startWeight) - 1
  const yMax = Math.max(plan.targetWeight, plan.startWeight) + 1

  const startPoint = data[0]
  const goalPoint = data.at(-1)
  const checkpointPoints = plan.checkpoints.map((cp) => ({
    ...cp,
    point: data.find((item) => item.date === cp.date) ?? { date: cp.date, weight: cp.weight, label: cp.date.slice(5).replace('-', '/') },
  }))

  return (
    <div className={compact ? 'h-52 w-full' : 'h-64 w-full'}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="planGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(167,139,250,0.2)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical />
          <XAxis
            dataKey="label"
            stroke="#4B5563"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            dy={6}
          />
          <YAxis
            stroke="#4B5563"
            tick={{ fontSize: 10 }}
            domain={[yMin, yMax]}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v) => formatWeight(v, unit)}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#A78BFA"
            strokeWidth={2.5}
            dot={false}
            animationDuration={800}
          />
          {startPoint ? (
            <>
              <ReferenceLine x={startPoint.label} stroke="#A78BFA" strokeOpacity={0.35} />
              <ReferenceDot
                x={startPoint.label}
                y={startPoint.weight}
                shape={<StartDot />}
                label={
                  compact
                    ? undefined
                    : {
                        value: `Actuel\n${formatWeight(startPoint.weight, unit)}`,
                        position: 'bottom',
                        fill: '#9CA3AF',
                        fontSize: 10,
                      }
                }
              />
            </>
          ) : null}
          {checkpointPoints.map((cp) => (
            <ReferenceDot
              key={cp.id}
              x={cp.point.label}
              y={cp.weight}
              shape={<CheckpointDot />}
            />
          ))}
          {goalPoint ? (
            <>
              <ReferenceLine x={goalPoint.label} stroke="#FBBF24" strokeOpacity={0.35} />
              <ReferenceDot
                x={goalPoint.label}
                y={goalPoint.weight}
                shape={<GoalDot />}
                label={
                  compact
                    ? undefined
                    : {
                        value: `${formatDatePlanShort(plan.endDate)}\n${formatWeight(plan.targetWeight, unit)}`,
                        position: 'bottom',
                        fill: '#FBBF24',
                        fontSize: 10,
                      }
                }
              />
            </>
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PlanChart
