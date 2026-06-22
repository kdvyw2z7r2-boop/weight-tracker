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
  const bmi = latest ? getBmi(latest.weight, settings.height, settings.unit) : null
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
          <h1 className="text-[20px] font-black leading-tight tracking-tight uppercase neon-text-cyan">
            Weight
          </h1>
          <p className="mt-0.5 text-[12px] capitalize text-text-tertiary font-medium tracking-wide">{formatDateLong()}</p>
        </div>
      </header>

      {/* Hero weight card */}
      <div className="card-base card-glow card-electric animate-scale-in animate-stagger-1 p-6">
        <p className="section-label">Poids actuel</p>
        <p className="hero-weight hero-weight-gradient mt-2 tabular-nums">
          {displayWeight}
          {latest ? (
            <span className="ml-2 text-2xl font-bold" style={{ WebkitTextFillColor: 'rgba(255,255,255,0.4)' }}>{settings.unit}</span>
          ) : null}
        </p>
        {entries.length > 0 ? (
          <div className="mt-3">
            <span className={`badge-neon ${delta === null ? 'badge-neon-neutral' : delta <= 0 ? 'badge-neon-green' : 'badge-neon-red'}`}>
              {deltaLabel}
            </span>
          </div>
        ) : null}

        {/* Inline stat row */}
        {latest ? (
          <div className="mt-5 flex items-center border-t pt-4" style={{ borderColor: 'rgba(0,229,255,0.1)' }}>
            <div className="stat-row-item" style={{ borderRight: '1px solid rgba(0,229,255,0.1)' }}>
              <span className={`stat-row-value ${bmi ? 'neon-text-cyan' : 'text-text-tertiary'}`}>
                {bmi ? bmi.toFixed(1).replace('.', ',') : '—'}
              </span>
              <span className="stat-row-label">IMC</span>
            </div>
            <div className="stat-row-item" style={{ borderRight: '1px solid rgba(0,229,255,0.1)' }}>
              <span className={`stat-row-value ${monthVariation === null ? 'text-text-tertiary' : monthVariation <= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                {monthVarLabel}
              </span>
              <span className="stat-row-label">Ce mois</span>
            </div>
            <div className="stat-row-item">
              <span className="stat-row-value neon-text-purple">
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
                <p className="text-[12px] neon-text-purple">
                  {formatPace(weightPlan.weeklyPace)}
                </p>
              ) : (
                        <button
                  type="button"
                  onClick={onEditPlan}
                  className="press-button text-[12px] neon-text-cyan"
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
