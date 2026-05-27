import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function WeightChart({ data, movingAverage, targetWeight }) {
  const merged = data.map((entry) => ({
    ...entry,
    avg: movingAverage.find((item) => item.date === entry.date)?.avg,
    label: entry.date.slice(5),
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
          <XAxis dataKey="label" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip />
          {Number.isFinite(targetWeight) ? (
            <ReferenceLine y={targetWeight} stroke="#6B7280" strokeDasharray="3 3" />
          ) : null}
          <Line type="monotone" dataKey="weight" stroke="#FFFFFF" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="avg" stroke="#60A5FA" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default WeightChart
