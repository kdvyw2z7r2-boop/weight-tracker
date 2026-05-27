import { addDays, format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import PillSelector from '../components/PillSelector'
import QuickStatCard from '../components/QuickStatCard'
import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { getBmi, getBmiCategory } from '../utils/stats'

const PERIODS = [
  { key: '2w', label: '2 sem.', days: 14 },
  { key: '1m', label: '1 mois', days: 30 },
  { key: '3m', label: '3 mois', days: 90 },
  { key: '6m', label: '6 mois', days: 180 },
  { key: 'all', label: 'Tout', days: null },
]

const bmiZones = [
  { label: 'Maigreur', max: 18.5, color: '#38BDF8' },
  { label: 'Normal', max: 25, color: '#4ADE80' },
  { label: 'Surpoids', max: 30, color: '#FBBF24' },
  { label: 'Obésité', max: 40, color: '#F87171' },
]

function StatsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-bg-card px-3 py-2">
      <p className="text-[12px] text-text-tertiary">{payload[0]?.payload?.range} kg</p>
      <p className="text-sm font-semibold">{payload[0]?.value} pesée(s)</p>
    </div>
  )
}

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

  const bmiValue = getBmi(current, settings.height)
  const bmiRounded = bmiValue ? Number(bmiValue.toFixed(1)) : null
  const bmiCategory = getBmiCategory(bmiRounded)
  const animatedBmi = useAnimatedNumber(bmiRounded ?? 0, 800)
  const gaugeMax = 40
  const markerPercent = bmiRounded ? Math.max(0, Math.min(100, (bmiRounded / gaugeMax) * 100)) : 0

  const distribution = Object.entries(
    filteredEntries.reduce((acc, entry) => {
      const bucket = `${Math.floor(entry.weight)}-${Math.floor(entry.weight) + 1}`
      acc[bucket] = (acc[bucket] ?? 0) + 1
      return acc
    }, {}),
  ).map(([range, count]) => ({ range, count }))

  return (
    <section className="space-y-4">
      <div className="animate-fade-up">
        <h2 className="text-[18px] font-semibold">Statistiques</h2>
        <p className="mt-0.5 text-[13px] text-text-tertiary">Analyse de votre progression</p>
      </div>

      <div className="animate-fade-up animate-stagger-1">
        <PillSelector options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <div className="card-base card-glow animate-fade-up animate-stagger-2">
        <p className="section-label">IMC actuel</p>
        <p className="hero-weight mt-2 tabular-nums">{bmiRounded !== null ? animatedBmi.toFixed(1).replace('.', ',') : '—'}</p>
        <p className={`mt-2 text-sm font-medium ${bmiCategory.colorClass}`}>{bmiCategory.label}</p>

        <div className="relative mt-6 pt-4">
          {bmiRounded !== null ? (
            <div
              className="absolute top-0 -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ left: `${markerPercent}%` }}
              aria-hidden="true"
            >
              <div className="h-0 w-0 border-x-[7px] border-b-[9px] border-x-transparent border-b-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
            </div>
          ) : null}
          <div className="flex h-3 overflow-hidden rounded-full">
            {bmiZones.map((zone) => (
              <div key={zone.label} className="h-full flex-1" style={{ backgroundColor: zone.color }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-text-tertiary">
            {bmiZones.map((zone) => (
              <span key={zone.label}>{zone.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <QuickStatCard label="Minimum" value={`${min.toFixed(1).replace('.', ',')} ${settings.unit}`} delay={180} />
        <QuickStatCard label="Maximum" value={`${max.toFixed(1).replace('.', ',')} ${settings.unit}`} delay={220} />
        <QuickStatCard label="Moyenne" value={`${avg.toFixed(1).replace('.', ',')} ${settings.unit}`} delay={260} />
        <QuickStatCard label="Pesées" value={String(filteredEntries.length)} delay={300} />
      </div>

      <div className="card-base animate-fade-up animate-stagger-4">
        <p className="section-label">Projection objectif</p>
        <p className="mt-2 text-[15px] leading-relaxed text-text-primary">
          {projectedDate ? `À ce rythme : ${projectedDate}` : 'Données insuffisantes pour estimer'}
        </p>
      </div>

      <div className="card-base animate-fade-up animate-stagger-5 h-64">
        <p className="section-label mb-4">Répartition des poids</p>
        {distribution.length ? (
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="range" stroke="#4B5563" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#4B5563" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<StatsTooltip />} cursor={{ fill: 'rgba(96,165,250,0.08)' }} />
              <Bar
                dataKey="count"
                fill="rgba(96, 165, 250, 0.6)"
                radius={[6, 6, 0, 0]}
                animationDuration={700}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[14px] text-text-tertiary">
            Pas de données pour cette période
          </div>
        )}
      </div>
    </section>
  )
}

export default StatsScreen
