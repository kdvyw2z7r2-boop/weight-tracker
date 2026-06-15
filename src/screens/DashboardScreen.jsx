import { useMemo } from 'react'
import ProgressCompare from '../components/ProgressCompare'
import ProgressRing from '../components/ProgressRing'
import WeightChart from '../components/WeightChart'
import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { formatDateLong } from '../utils/locale'
import {
  getBmi,
  getBmiCategory,
  getCurrentStreak,
  getMonthVariation,
} from '../utils/stats'
import { computeWeightPlan, formatPace, resolvePlanAnchor } from '../utils/weightPlan'

function DashboardScreen({ entries, settings, movingAverage, photosByDate, onEditPlan }) {
  const latest = entries[0]
  const previous = entries[1]
  const delta = latest && previous ? latest.weight - previous.weight : null
  const sortedAsc = useMemo(
    () => [...entries].sort((a, b) => (a.date > b.date ? 1 : -1)),
    [entries],
  )
  const firstEntry = sortedAsc[0]
  const startWeight = firstEntry?.weight ?? latest?.weight ?? settings.targetWeight
  const monthVariation = getMonthVariation(entries)
  const streak = getCurrentStreak(entries)
  const bmi = latest ? getBmi(latest.weight, settings.height) : null
  const bmiCategory = getBmiCategory(bmi)
  const animatedWeight = useAnimatedNumber(latest?.weight ?? 0, 800)

  const weightPlan = useMemo(() => {
    if (!settings.weeklyPace) return null
    const anchor = resolvePlanAnchor(settings, entries)
    if (!anchor) return null
    return computeWeightPlan({
      startWeight: anchor.startWeight,
      targetWeight: settings.targetWeight,
      weeklyPace: settings.weeklyPace,
      startDate: anchor.startDate,
    })
  }, [settings.weeklyPace, settings.targetWeight, settings.planStartDate, settings.planStartWeight, entries])

  const entriesAsc = useMemo(() => [...entries].reverse(), [entries])

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
    monthVariation === null ? 'text-text-tertiary' : monthVariation <= 0 ? 'text-accent-green' : 'text-accent-red'

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
      </header>

      {/* Hero weight card */}
      <div className="card-base card-glow animate-scale-in animate-stagger-1 rounded-[20px] p-6">
        <p className="section-label">Poids actuel</p>
        <p className="hero-weight mt-2 tabular-nums text-white">
          {displayWeight}
          {latest ? (
            <span className="ml-2 text-2xl font-semibold text-text-secondary">{settings.unit}</span>
          ) : null}
        </p>
        <p className={`mt-3 text-[15px] font-medium transition-colors duration-300 ${deltaColor}`}>{deltaLabel}</p>

        {/* Inline stat row */}
        {latest ? (
          <div className="mt-5 flex items-center border-t border-border pt-4">
            <div className="stat-row-item border-r border-border">
              <span className={`stat-row-value ${bmi ? bmiCategory.colorClass : 'text-text-tertiary'}`}>
                {bmi ? bmi.toFixed(1).replace('.', ',') : '—'}
              </span>
              <span className="stat-row-label">IMC</span>
            </div>
            <div className="stat-row-item border-r border-border">
              <span className={`stat-row-value ${monthVarColor}`}>{monthVarLabel}</span>
              <span className="stat-row-label">Ce mois</span>
            </div>
            <div className="stat-row-item">
              <span className="stat-row-value text-text-primary">
                {streak}{streak > 3 ? ' 🔥' : ''}
              </span>
              <span className="stat-row-label">Série</span>
            </div>
          </div>
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
              <p className="text-sm font-medium text-text-primary">Évolution du poids</p>
              {weightPlan ? (
                <p className="text-[12px] text-accent-purple">
                  {formatPace(weightPlan.weeklyPace)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={onEditPlan}
                  className="press-button text-[12px] text-text-tertiary underline-offset-2 hover:text-text-secondary"
                >
                  Définir un plan
                </button>
              )}
            </div>
            <WeightChart
              data={entriesAsc}
              movingAverage={movingAverage}
              targetWeight={settings.targetWeight}
              unit={settings.unit}
              plan={weightPlan}
            />
          </div>

          <ProgressCompare photosByDate={photosByDate} entries={entries} unit={settings.unit} />
        </>
      )}
    </section>
  )
}

export default DashboardScreen
