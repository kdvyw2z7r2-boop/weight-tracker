import { useMemo } from 'react'
import GlassCard from '../components/ui/GlassCard'
import ProgressRing from '../components/ProgressRing'
import WeightChart from '../components/WeightChart'
import WeeklyReviewCard from '../components/review/WeeklyReviewCard'
import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { getChallengeEntries, resolveChallengeStart } from '../utils/challenge'
import { formatDateLong, formatDateShort } from '../utils/locale'
import {
  getBmi,
  getCurrentStreak,
  getMonthVariation,
} from '../utils/stats'
import { computeWeightPlan, resolvePlanAnchor } from '../utils/weightPlan'
import { formatPace, formatWeight, formatWeightWithUnit } from '../utils/format'

function DashboardScreen({ entries, settings, movingAverage, onEditPlan, reviewData = null }) {
  const latest = entries[0]
  const previous = entries[1]
  const delta = latest && previous ? latest.weight - previous.weight : null
  const challengeEntries = useMemo(
    () => getChallengeEntries(entries, settings.challengeStartDate),
    [entries, settings.challengeStartDate],
  )
  const challengeStart = resolveChallengeStart(settings, entries)
  const startWeight = challengeStart?.startWeight ?? latest?.weight ?? settings.targetWeight
  const monthVariation = getMonthVariation(entries)
  const streak = getCurrentStreak(entries)
  const bmi = latest ? getBmi(latest.weight, settings.height, settings.unit) : null
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
  }, [settings, entries])

  const entriesAsc = useMemo(() => [...challengeEntries].reverse(), [challengeEntries])

  const deltaLabel =
    entries.length === 0
      ? 'Ajoutez votre première pesée'
      : delta === null
        ? '—'
        : `${delta > 0 ? '▲' : '▼'} ${formatWeightWithUnit(Math.abs(delta), settings.unit)}`

  const monthVarLabel =
    monthVariation === null
      ? '—'
      : `${monthVariation > 0 ? '+' : ''}${formatWeightWithUnit(monthVariation, settings.unit)}`

  const displayWeight = latest ? formatWeight(animatedWeight) : '—'

  const deltaTone = delta === null ? 'badge-tone-neutral' : delta <= 0 ? 'badge-tone-good' : 'badge-tone-bad'
  const monthTone = monthVariation === null ? 'text-text-tertiary' : monthVariation <= 0 ? 'text-good' : 'text-danger'

  return (
    <section className="space-y-3">
      <header className="animate-fade-up">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-text-primary">Mon poids</h1>
        <p className="mt-0.5 text-[13px] font-medium capitalize text-text-secondary">{formatDateLong()}</p>
      </header>

      <GlassCard className="animate-scale-in animate-stagger-1 p-5">
        <p className="text-[13px] font-semibold text-text-secondary">Poids du jour</p>
        <p className="hero-weight mt-1.5 text-text-primary" style={{ fontSize: 60 }}>
          {displayWeight}
          {latest ? <span className="ml-1.5 text-[18px] font-medium tracking-normal text-text-secondary">{settings.unit}</span> : null}
        </p>
        {entries.length > 0 ? (
          <div className="mt-3">
            <span className={`badge-tone ${deltaTone}`}>{deltaLabel}</span>
          </div>
        ) : null}
      </GlassCard>

      {/* Bilan hebdo */}
      {latest && reviewData ? <WeeklyReviewCard entries={entries} settings={settings} {...reviewData} /> : null}

      {latest ? (
        <div className="animate-fade-up animate-stagger-2 grid grid-cols-3 gap-2">
          <GlassCard size="sm" className="px-3 py-3">
            <span className="block text-[17px] font-semibold tabular-nums text-text-primary">
              {bmi ? bmi.toFixed(1).replace('.', ',') : '—'}
            </span>
            <span className="text-[12px] font-medium text-text-secondary">IMC</span>
          </GlassCard>
          <GlassCard size="sm" className="px-3 py-3">
            <span className={`block text-[17px] font-semibold tabular-nums ${monthTone}`}>{monthVarLabel}</span>
            <span className="text-[12px] font-medium text-text-secondary">Ce mois</span>
          </GlassCard>
          <GlassCard size="sm" className="px-3 py-3">
            <span className="block text-[17px] font-semibold tabular-nums text-streak">
              {streak}{streak > 3 ? ' 🔥' : ''}
            </span>
            <span className="text-[12px] font-medium text-text-secondary">Série</span>
          </GlassCard>
        </div>
      ) : null}

      {!latest ? (
        <GlassCard className="animate-fade-up animate-stagger-2 flex flex-col items-center px-5 py-10 text-center">
          <div className="glass-sm mb-5 flex h-16 w-16 items-center justify-center text-3xl" aria-hidden="true">
            ⚖️
          </div>
          <p className="text-[17px] font-semibold text-text-primary">Commencez votre suivi</p>
          <p className="mt-2 max-w-[260px] text-[14px] leading-relaxed text-text-secondary">
            Enregistrez votre première pesée pour voir votre progression et vos statistiques.
          </p>
        </GlassCard>
      ) : (
        <>
          <ProgressRing
            startWeight={startWeight}
            startDate={challengeStart?.startDate}
            currentWeight={latest.weight}
            targetWeight={settings.targetWeight}
            unit={settings.unit}
            entriesCount={settings.challengeStartDate ? challengeEntries.length + 1 : entries.length}
          />

          <GlassCard className="animate-fade-up animate-stagger-3 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-text-primary">Évolution du poids</p>
                {settings.challengeStartDate ? (
                  <p className="mt-0.5 text-[12px] text-text-secondary">
                    Depuis le {formatDateShort(settings.challengeStartDate)}
                  </p>
                ) : null}
              </div>
              {weightPlan ? (
                <p className="text-[13px] font-medium text-plan">
                  {formatPace(weightPlan.weeklyPace, settings.unit)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={onEditPlan}
                  className="press-button min-h-11 px-2 text-[13px] font-medium text-accent"
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
            <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-text-secondary" aria-label="Légende du graphique">
              <li className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-weight" aria-hidden="true" />
                Poids
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-avg" aria-hidden="true" />
                Moyenne 7 j
              </li>
              {weightPlan ? (
                <li className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-plan" aria-hidden="true" />
                  Plan
                </li>
              ) : null}
            </ul>
          </GlassCard>
        </>
      )}
    </section>
  )
}

export default DashboardScreen
