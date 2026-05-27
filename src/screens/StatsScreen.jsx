import { addDays, format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const PERIODS = [
  { key: '2w', label: '2S', days: 14 },
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: 'all', label: 'Tout', days: null },
]

function StatsScreen({ entries, settings }) {
  const [period, setPeriod] = useState('all')
  const filteredEntries = useMemo(() => {
    const selected = PERIODS.find((item) => item.key === period)
    if (!selected || selected.days === null) return entries
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - selected.days)
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    return entries.filter((entry) => entry.date >= cutoffIso)
  }, [entries, period])

  const weights = filteredEntries.map((entry) => entry.weight)
  const current = filteredEntries[0]?.weight ?? 0
  const min = weights.length ? Math.min(...weights) : 0
  const max = weights.length ? Math.max(...weights) : 0
  const avg = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0

  const last30 = [...filteredEntries].slice(0, 30)
  const oldest = last30.at(-1)
  const dailyRate = oldest ? (current - oldest.weight) / Math.max(1, last30.length - 1) : 0
  const daysLeft = dailyRate !== 0 ? Math.abs((current - settings.targetWeight) / dailyRate) : null
  const projectedDate = daysLeft ? format(addDays(new Date(), Math.ceil(daysLeft)), 'dd/MM/yyyy') : null
  const heightM = settings.height ? settings.height / 100 : 0
  const bmi = current > 0 && heightM > 0 ? current / (heightM * heightM) : null
  const bmiValue = bmi ? Number(bmi.toFixed(1)) : null

  const bmiZones = [
    { label: 'Insuffisance', max: 18.5, color: 'bg-sky-500' },
    { label: 'Normal', max: 25, color: 'bg-green-500' },
    { label: 'Surpoids', max: 30, color: 'bg-orange-500' },
    { label: 'Obesite', max: 40, color: 'bg-red-500' },
  ]
  const gaugeMax = 40
  const markerPercent = bmiValue ? Math.max(0, Math.min(100, (bmiValue / gaugeMax) * 100)) : 0
  const bmiCategory =
    bmiValue === null
      ? null
      : bmiValue < 18.5
        ? { label: 'Insuffisance', text: 'text-sky-400' }
        : bmiValue < 25
          ? { label: 'Normal', text: 'text-green-400' }
          : bmiValue < 30
            ? { label: 'Surpoids', text: 'text-orange-400' }
            : { label: 'Obesite', text: 'text-red-400' }

  const distribution = Object.entries(
    filteredEntries.reduce((acc, entry) => {
      const bucket = `${Math.floor(entry.weight)}-${Math.floor(entry.weight) + 1}`
      acc[bucket] = (acc[bucket] ?? 0) + 1
      return acc
    }, {}),
  ).map(([range, count]) => ({ range, count }))

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Statistiques</h2>
      <div className="flex items-center gap-2">
        {PERIODS.map((item) => {
          const active = period === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key)}
              className={`rounded-lg border border-border px-3 py-1 text-sm ${
                active ? 'bg-white text-black' : 'bg-transparent text-text-secondary'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <div className="rounded-2xl bg-bg-card p-4">
        <p className="text-sm text-text-secondary">IMC actuel</p>
        <p className="mt-1 text-4xl font-bold">{bmiValue ?? '--'}</p>
        <div className="mt-3">
          <div className="relative h-3 overflow-hidden rounded-full">
            <div className="flex h-full">
              {bmiZones.map((zone) => (
                <div key={zone.label} className={`h-full flex-1 ${zone.color}`} />
              ))}
            </div>
            {bmiValue !== null ? (
              <span
                className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white"
                style={{ left: `${markerPercent}%` }}
                aria-hidden="true"
              />
            ) : null}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-text-secondary">
            {bmiZones.map((zone) => (
              <span key={zone.label}>{zone.label}</span>
            ))}
          </div>
        </div>
        <p className={`mt-3 text-sm font-medium ${bmiCategory?.text ?? 'text-text-secondary'}`}>
          {bmiCategory ? `Categorie: ${bmiCategory.label}` : 'Categorie: --'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-bg-card p-4"><p className="text-sm text-text-secondary">Min</p><p>{min.toFixed(1)}</p></div>
        <div className="rounded-2xl bg-bg-card p-4"><p className="text-sm text-text-secondary">Max</p><p>{max.toFixed(1)}</p></div>
        <div className="rounded-2xl bg-bg-card p-4"><p className="text-sm text-text-secondary">Moyenne</p><p>{avg.toFixed(1)}</p></div>
        <div className="rounded-2xl bg-bg-card p-4"><p className="text-sm text-text-secondary">Pesees</p><p>{filteredEntries.length}</p></div>
      </div>
      <div className="rounded-2xl bg-bg-card p-4">
        <p className="text-sm text-text-secondary">Projection objectif</p>
        <p className="mt-1">{projectedDate ? `A ce rythme: ${projectedDate}` : 'Donnees insuffisantes'}</p>
      </div>
      <div className="h-64 rounded-2xl bg-bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="range" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip />
            <Bar dataKey="count" fill="#4B5563" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default StatsScreen
