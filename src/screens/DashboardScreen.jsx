import { useMemo } from 'react'
import HudHeader from '../components/HudHeader'
import MotivationBanner from '../components/MotivationBanner'
import ProgressCompare from '../components/ProgressCompare'
import ProgressRing from '../components/ProgressRing'
import StatOrb from '../components/StatOrb'
import StreakCard from '../components/StreakCard'
import WeightChart from '../components/WeightChart'
import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { getMotivation } from '../utils/motivation'
import {
  getBmi,
  getBmiCategory,
  getCurrentStreak,
  getLowestIn7Days,
  getMonthVariation,
} from '../utils/stats'
import { computeActualRates, computeWeightPlan, formatPace, resolvePlanAnchor } from '../utils/weightPlan'

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
  const lowest7 = getLowestIn7Days(entries)
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

  const anchor = resolvePlanAnchor(settings, entries)
  const { currentRate } = computeActualRates(entries, anchor?.startDate)

  const entriesAsc = useMemo(() => [...entries].reverse(), [entries])
  const recentWeights = useMemo(() => entriesAsc.slice(-14).map((e) => e.weight), [entriesAsc])

  const denom = startWeight - settings.targetWeight
  const progress =
    entries.length >= 2 && denom !== 0
      ? Math.max(0, Math.min(100, ((startWeight - latest.weight) / denom) * 100))
      : 0

  const motivation = useMemo(
    () =>
      getMotivation({
        entriesCount: entries.length,
        streak,
        delta,
        progress,
        monthVariation,
      }),
    [entries.length, streak, delta, progress, monthVariation],
  )

  const remaining =
    latest && settings.targetWeight ? Math.max(0, latest.weight - settings.targetWeight) : null

  const deltaLabel =
    entries.length === 0
      ? 'Première pesée'
      : delta === null
        ? '—'
        : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1).replace('.', ',')} ${settings.unit}`

  const monthVarLabel =
    monthVariation === null
      ? '—'
      : `${monthVariation > 0 ? '+' : ''}${monthVariation.toFixed(1).replace('.', ',')}`

  const displayWeight = latest
    ? settings.unit === 'kg'
      ? animatedWeight.toFixed(1).replace('.', ',')
      : animatedWeight.toFixed(1)
    : '—'

  return (
    <section className="space-y-4">
      <HudHeader
        title="Dashboard"
        subtitle="Centre de contrôle"
        badge={<span className="data-badge data-badge-live">Live</span>}
      />

      <MotivationBanner {...motivation} delay={1} />

      {/* Hero HUD */}
      <div className="hud-card card-electric animate-scale-in animate-stagger-2 p-6">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <p className="section-label">Poids actuel</p>
            {entries.length > 0 ? (
              <span
                className={`badge-neon ${
                  delta === null ? 'badge-neon-neutral' : delta <= 0 ? 'badge-neon-green' : 'badge-neon-red'
                }`}
              >
                {deltaLabel}
              </span>
            ) : null}
          </div>

          <p className="hero-hud-weight mt-3 tabular-nums">
            {displayWeight}
            {latest ? (
              <span
                className="ml-2 text-xl font-bold"
                style={{ WebkitTextFillColor: 'rgba(255,255,255,0.35)' }}
              >
                {settings.unit}
              </span>
            ) : null}
          </p>

          {bmiCategory.label !== '--' ? (
            <p className={`mt-2 text-[12px] font-bold uppercase tracking-wider ${bmiCategory.colorClass}`}>
              IMC {bmi ? bmi.toFixed(1).replace('.', ',') : '—'} · {bmiCategory.label}
            </p>
          ) : null}
        </div>
      </div>

      {!latest ? (
        <div className="hud-card animate-fade-up animate-stagger-3 flex flex-col items-center py-10 text-center">
          <div className="empty-state-icon animate-float mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">
            ⚡
          </div>
          <p className="font-display text-base font-bold uppercase tracking-wide text-white">Initialisez le système</p>
          <p className="mt-2 max-w-[260px] text-[14px] leading-relaxed text-text-tertiary">
            Enregistrez votre première pesée pour activer le tableau de bord analytique.
          </p>
        </div>
      ) : (
        <>
          <div className="stats-grid animate-fade-up animate-stagger-3">
            <StatOrb
              label="IMC"
              value={bmi ? bmi.toFixed(1).replace('.', ',') : '—'}
              sublabel={bmiCategory.label}
              accent="cyan"
              sparkData={recentWeights}
              delay={3}
            />
            <StatOrb
              label="Restant"
              value={remaining != null ? remaining.toFixed(1).replace('.', ',') : '—'}
              unit={settings.unit}
              sublabel="Vers l'objectif"
              accent="amber"
              delay={4}
            />
            <StatOrb
              label="Ce mois"
              value={monthVarLabel}
              unit={monthVariation != null ? settings.unit : undefined}
              sublabel="Variation mensuelle"
              accent={monthVariation == null ? 'white' : monthVariation <= 0 ? 'green' : 'red'}
              sparkData={recentWeights}
              delay={5}
            />
            <StatOrb
              label="Série"
              value={String(streak)}
              unit={streak > 1 ? 'jours' : streak === 1 ? 'jour' : undefined}
              sublabel={streak > 3 ? 'En feu 🔥' : 'Jours consécutifs'}
              accent="purple"
              delay={6}
            />
          </div>

          <ProgressRing
            startWeight={startWeight}
            startDate={firstEntry?.date}
            currentWeight={latest.weight}
            targetWeight={settings.targetWeight}
            unit={settings.unit}
            entriesCount={entries.length}
          />

          <div className="stats-grid animate-fade-up animate-stagger-4">
            <StatOrb
              label="Rythme actuel"
              value={currentRate != null && currentRate > 0 ? currentRate.toFixed(2).replace('.', ',') : '—'}
              unit="kg/sem."
              sublabel="Perte hebdomadaire"
              accent="green"
              delay={4}
            />
            <StatOrb
              label="Min. 7 jours"
              value={lowest7 != null ? lowest7.toFixed(1).replace('.', ',') : '—'}
              unit={lowest7 != null ? settings.unit : undefined}
              sublabel="Record récent"
              accent="cyan"
              sparkData={recentWeights}
              delay={5}
            />
          </div>

          <div className="chart-card animate-fade-up animate-stagger-5">
            <div className="chart-card-header">
              <div>
                <p className="section-label">Évolution du poids</p>
                <p className="mt-1 text-[13px] text-text-tertiary">Courbe + moyenne mobile 7j</p>
              </div>
              {weightPlan ? (
                <div className="text-right">
                  <span className="data-badge">Plan actif</span>
                  <p className="mt-1.5 text-[12px] neon-text-purple">{formatPace(weightPlan.weeklyPace)}</p>
                </div>
              ) : (
                <button type="button" onClick={onEditPlan} className="press-button text-[12px] neon-text-cyan font-bold">
                  + Plan
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

          <StreakCard entries={entries} />

          <ProgressCompare photosByDate={photosByDate} entries={entries} unit={settings.unit} />
        </>
      )}
    </section>
  )
}

export default DashboardScreen
