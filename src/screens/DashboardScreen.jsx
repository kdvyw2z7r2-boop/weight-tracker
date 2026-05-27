import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import BMICard from '../components/BMICard'
import ProgressRing from '../components/ProgressRing'
import WeightChart from '../components/WeightChart'

const PERIODS = [
  { key: '2w', label: '2S', days: 14 },
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: 'all', label: 'Tout', days: null },
]

function DashboardScreen({ entries, settings, movingAverage, onAdd }) {
  const [period, setPeriod] = useState('all')
  const latest = entries[0]
  const previous = entries[1]
  const delta = latest && previous ? (latest.weight - previous.weight).toFixed(2) : null
  const sortedAsc = useMemo(
    () => [...entries].sort((a, b) => (a.date > b.date ? 1 : -1)),
    [entries],
  )
  const firstEntry = sortedAsc[0]
  const startWeight = firstEntry?.weight ?? latest?.weight ?? settings.targetWeight
  const filteredEntriesAsc = useMemo(() => {
    const selected = PERIODS.find((item) => item.key === period)
    if (!selected || selected.days === null) return [...entries].reverse()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - selected.days)
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    return [...entries].reverse().filter((entry) => entry.date >= cutoffIso)
  }, [entries, period])
  const filteredMovingAverage = useMemo(() => {
    const dates = new Set(filteredEntriesAsc.map((entry) => entry.date))
    return movingAverage.filter((item) => dates.has(item.date))
  }, [filteredEntriesAsc, movingAverage])

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Weight Tracker</h1>
          <p className="text-sm text-text-secondary">{format(new Date(), 'EEEE d MMMM')}</p>
        </div>
        <button type="button" onClick={onAdd} className="h-10 w-10 rounded-xl bg-white text-2xl text-black">
          +
        </button>
      </header>

      <div className="rounded-2xl bg-bg-card p-5">
        <p className="text-xs uppercase tracking-wide text-text-secondary">Poids actuel</p>
        <p className="mt-1 text-5xl font-bold">{latest ? `${latest.weight} ${settings.unit}` : '--'}</p>
        <p className={`mt-2 text-sm ${delta ? (Number(delta) <= 0 ? 'text-green-400' : 'text-red-400') : 'text-text-secondary'}`}>
          {entries.length === 0
            ? 'Ajoute ta premiere pesee'
            : delta
              ? `${Number(delta) > 0 ? '▲' : '▼'} ${Math.abs(delta)} ${settings.unit}`
              : 'Premiere entree enregistree'}
        </p>
      </div>

      {latest ? (
        <>
          <ProgressRing
            startWeight={startWeight}
            currentWeight={latest.weight}
            targetWeight={settings.targetWeight}
            entriesCount={entries.length}
          />
          <div className="rounded-2xl bg-bg-card p-4">
            <WeightChart data={filteredEntriesAsc} movingAverage={filteredMovingAverage} targetWeight={settings.targetWeight} />
            <div className="mt-3 flex items-center gap-2">
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <BMICard weight={latest.weight} height={settings.height} />
            <div className="rounded-2xl bg-bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-text-secondary">Objectif</p>
              <p className="mt-1 text-2xl font-semibold">{settings.targetWeight} {settings.unit}</p>
            </div>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={onAdd}
        className="fixed bottom-20 right-5 rounded-full bg-white px-4 py-3 font-medium text-black shadow-lg"
      >
        Ajouter une pesee
      </button>
    </section>
  )
}

export default DashboardScreen
