import { useMemo, useState } from 'react'
import PillSelector from '../components/PillSelector'
import ProgressRing from '../components/ProgressRing'
import QuickStatCard from '../components/QuickStatCard'
import StreakCard from '../components/StreakCard'
import WeightChart from '../components/WeightChart'
import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { formatDateLong } from '../utils/locale'
import {
  getBmi,
  getBmiCategory,
  getCurrentStreak,
  getLowestIn7Days,
  getMonthVariation,
} from '../utils/stats'
import { computeWeightPlan, formatPace } from '../utils/weightPlan'

const PERIODS = [
  { key: '2w', label: '2 sem.', days: 14 },
  { key: '1m', label: '1 mois', days: 30 },
  { key: '3m', label: '3 mois', days: 90 },
  { key: '6m', label: '6 mois', days: 180 },
  { key: 'all', label: 'Tout', days: null },
]

function DashboardScreen({ entries, settings, movingAverage, onAdd, onEditPlan }) {
  const [period, setPeriod] = useState('all')
  const latest = entries[0]
  const previous = entries[1]
  const delta = latest && previous ? latest.weight - previous.weight : null
  const sortedAsc = useMemo(
    () => [...entries].sort((a, b) => (a.date > b.date ? 1 : -1)),
    [entries],
  )
  const firstEntry = sortedAsc[0]
  const startWeight = firstEntry?.weight ?? latest?.weight ?? settings.targetWeight
  const lowest7 = getLowestIn7Days(entries)
  const monthVariation = getMonthVariation(entries)
  const streak = getCurrentStreak(entries)
  const bmi = latest ? getBmi(latest.weight, settings.height) : null
  const bmiCategory = getBmiCategory(bmi)
  const animatedWeight = useAnimatedNumber(latest?.weight ?? 0, 800)

  const weightPlan = useMemo(() => {
    if (!settings.weeklyPace || !latest) return null
    return computeWeightPlan({
      startWeight: latest.weight,
      targetWeight: settings.targetWeight,
      weeklyPace: settings.weeklyPace,
      startDate: latest.date,
    })
  }, [settings.weeklyPace, settings.targetWeight, latest])

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

  const deltaLabel =
    entries.length === 0
      ? 'Ajoutez votre première pesée'
      : delta === null
        ? '—'
        : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1).replace('.', ',')} ${settings.unit}`

  const deltaColor =
    delta === null ? 'text-text-tertiary' : delta <= 0 ? 'text-accent-green' : 'text-accent-red'

  const monthVarLabel =
    monthVariation === null
      ? '—'
      : `${monthVariation > 0 ? '+' : ''}${monthVariation.toFixed(1).replace('.', ',')} ${settings.unit}`

  const monthVarColor =
    monthVariation === null
      ? 'text-text-tertiary'
      : monthVariation <= 0
        ? 'text-accent-green'
        : 'text-accent-red'

  const displayWeight = latest
    ? settings.unit === 'kg'
      ? animatedWeight.toFixed(1).replace('.', ',')
      : animatedWeight.toFixed(1)
    : '—'

  return (
    <section className="space-y-4">
      <header className="animate-fade-up flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-semibold leading-tight">Suivi de poids</h1>
          <p className="mt-0.5 text-[13px] capitalize text-text-tertiary">{formatDateLong()}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="btn-primary flex h-11 w-11 items-center justify-center text-2xl font-light"
          aria-label="Ajouter une pesée"
        >
          +
        </button>
      </header>

      <div className="card-base card-glow animate-scale-in animate-stagger-1 rounded-[20px] p-6">
        <p className="section-label">Poids actuel</p>
        <p className="hero-weight mt-2 tabular-nums text-white">
          {displayWeight}
          {latest ? (
            <span className="ml-2 text-2xl font-semibold text-text-secondary">{settings.unit}</span>
          ) : null}
        </p>
        <p className={`mt-3 text-[15px] font-medium transition-colors duration-300 ${deltaColor}`}>{deltaLabel}</p>
        {lowest7 !== null && latest && lowest7 < latest.weight ? (
          <p className="mt-1.5 text-[13px] text-text-tertiary">
            Le plus bas sur 7 jours : {lowest7.toString().replace('.', ',')} {settings.unit}
          </p>
        ) : null}
      </div>

      {!latest ? (
        <div className="card-base animate-fade-up animate-stagger-2 flex flex-col items-center py-10 text-center">
          <div className="empty-state-icon animate-float mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">
            ⚖️
          </div>
          <p className="text-base font-medium text-text-primary">Commencez votre suivi</p>
          <p className="mt-2 max-w-[240px] text-[14px] leading-relaxed text-text-tertiary">
            Enregistrez votre première pesée pour voir votre progression et vos statistiques.
          </p>
          <button type="button" onClick={onAdd} className="btn-primary mt-6 h-12 px-8 text-[15px]">
            Enregistrer le poids
          </button>
        </div>
      ) : (
        <>
          <ProgressRing
            startWeight={startWeight}
            startDate={firstEntry?.date}
            currentWeight={latest.weight}
            targetWeight={settings.targetWeight}
            unit={settings.unit}
            entriesCount={entries.length}
          />

          <div className="card-base animate-fade-up animate-stagger-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Évolution du poids</p>
                {weightPlan ? (
                  <p className="mt-0.5 text-[12px] text-[#A78BFA]">
                    {weightPlan.checkpoints.length} point{weightPlan.checkpoints.length > 1 ? 's' : ''} de contrôle ·{' '}
                    {formatPace(weightPlan.weeklyPace)}
                  </p>
                ) : null}
              </div>
              <span className="text-[12px] text-text-tertiary">{filteredEntriesAsc.length} entrée(s)</span>
            </div>
            <WeightChart
              data={filteredEntriesAsc}
              movingAverage={filteredMovingAverage}
              targetWeight={settings.targetWeight}
              unit={settings.unit}
              plan={weightPlan}
            />
            {weightPlan ? (
              <button
                type="button"
                onClick={onEditPlan}
                className="press-button mt-3 w-full text-[13px] font-medium text-[#A78BFA]"
              >
                Ajuster l&apos;objectif et le rythme
              </button>
            ) : (
              <button
                type="button"
                onClick={onEditPlan}
                className="press-button mt-3 w-full rounded-xl bg-bg-elevated py-2.5 text-[13px] font-medium text-text-secondary"
              >
                Définir un rythme et des points de contrôle
              </button>
            )}
            <div className="mt-4">
              <PillSelector options={PERIODS} value={period} onChange={setPeriod} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <QuickStatCard
              label="IMC"
              value={bmi ? bmi.toFixed(1).replace('.', ',') : '—'}
              sublabel={{ text: bmiCategory.label, className: bmiCategory.colorClass }}
              delay={240}
            />
            <QuickStatCard
              label="Ce mois"
              value={monthVarLabel}
              valueClassName={monthVarColor}
              delay={300}
            />
            <QuickStatCard
              label="Série"
              value={
                <>
                  {streak}
                  {streak > 3 ? ' 🔥' : ''}
                </>
              }
              delay={360}
            />
          </div>

          <StreakCard entries={entries} />
        </>
      )}
    </section>
  )
}

export default DashboardScreen
