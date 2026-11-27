import { useMemo, useState } from 'react'
import BmiChart from '../components/BmiChart'
import GlassButton from '../components/ui/GlassButton'
import GlassCard from '../components/ui/GlassCard'
import SegmentedControl from '../components/ui/SegmentedControl'
import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { daysAgoIso } from '../utils/dates'
import { formatDatePlanShort } from '../utils/locale'
import { projectGoalDate } from '../utils/projection'
import {
  BMI_GAUGE_MAX,
  BMI_ZONES,
  getBmi,
  getBmiCategory,
  getBmiHistory,
  getBmiMarkerPercent,
  getBmiMovingAverage,
  getBmiStats,
  getBmiZoneWidths,
} from '../utils/stats'
import {
  computeActualRates,
  computeWeightPlan,
  getNextCheckpoint,
  resolvePlanAnchor,
} from '../utils/weightPlan'
import { formatPace, formatWeightWithUnit } from '../utils/format'
import MeasurementsCard from '../components/measurements/MeasurementsCard'
import BadgesShowcase from '../components/badges/BadgesShowcase'

const PERIODS = [
  { key: '1m', label: '1 mois', days: 30 },
  { key: '3m', label: '3 mois', days: 90 },
  { key: '6m', label: '6 mois', days: 180 },
  { key: 'all', label: 'Tout', days: null },
]
const PERIOD_OPTIONS = PERIODS.map((item) => ({ value: item.key, label: item.label }))

function formatBmi(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(1).replace('.', ',')
}

function ProgressScreen({
  entries,
  settings,
  onEditPlan,
  // Mensurations / badges (sections ajoutées en bas de l'écran).
  measurements = [],
  onSaveMeasurement,
  onDeleteMeasurements,
  badges = null,
}) {
  const [period, setPeriod] = useState('all')

  const filteredEntries = useMemo(() => {
    const selected = PERIODS.find((item) => item.key === period)
    if (!selected || selected.days === null) return entries
    const cutoffIso = daysAgoIso(selected.days)
    return entries.filter((entry) => entry.date >= cutoffIso)
  }, [entries, period])

  const weights = filteredEntries.map((entry) => entry.weight)
  const minWeight = weights.length ? Math.min(...weights) : 0
  const avgWeight = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0

  const projectedIso = projectGoalDate(filteredEntries, settings.targetWeight).date
  const projectedDate = projectedIso ? projectedIso.split('-').reverse().join('/') : null

  const latestBmi = getBmi(entries[0]?.weight, settings.height, settings.unit)
  const bmiRounded = latestBmi != null ? Number(latestBmi.toFixed(1)) : null
  const bmiCategory = getBmiCategory(bmiRounded)
  const animatedBmi = useAnimatedNumber(bmiRounded ?? 0, 800)
  const markerPercent = getBmiMarkerPercent(bmiRounded, BMI_GAUGE_MAX)
  const bmiZoneWidths = getBmiZoneWidths(BMI_GAUGE_MAX)

  const bmiHistory = useMemo(
    () => getBmiHistory(filteredEntries, settings.height, settings.unit),
    [filteredEntries, settings.height, settings.unit],
  )
  const bmiMovingAverage = useMemo(() => getBmiMovingAverage(bmiHistory, 7), [bmiHistory])
  const bmiStats = useMemo(
    () => getBmiStats(filteredEntries, settings.height, settings.unit),
    [filteredEntries, settings.height, settings.unit],
  )

  const bmiDeltaLabel =
    bmiStats.delta == null
      ? '—'
      : `${bmiStats.delta > 0 ? '+' : ''}${formatBmi(bmiStats.delta)}`

  const bmiDeltaColor =
    bmiStats.delta == null ? 'text-text-tertiary' : bmiStats.delta <= 0 ? 'text-good-text' : 'text-danger-text'

  // Plan section
  const anchor = useMemo(() => resolvePlanAnchor(settings, entries), [settings, entries])
  const plan = useMemo(() => {
    if (!settings.weeklyPace || !anchor?.startWeight || !anchor?.startDate) return null
    return computeWeightPlan({
      startWeight: anchor.startWeight,
      targetWeight: settings.targetWeight,
      weeklyPace: settings.weeklyPace,
      startDate: anchor.startDate,
    })
  }, [settings.weeklyPace, settings.targetWeight, anchor])

  const nextCheckpoint = getNextCheckpoint(plan)
  const { currentRate } = computeActualRates(entries, anchor?.startDate)

  return (
    <section className="space-y-4">
      <div className="animate-fade-up">
        <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-text-primary">Progrès</h2>
        <p className="mt-0.5 text-[13px] font-medium text-text-secondary">Analyse et objectifs</p>
      </div>

      <div className="animate-fade-up animate-stagger-1">
        <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} ariaLabel="Période" />
      </div>

      {/* BMI card */}
      <GlassCard className="animate-fade-up animate-stagger-2 p-5">
        <p className="section-label">IMC</p>
        <div className="flex items-end gap-3 mt-2">
          <p className="hero-weight text-text-primary">{bmiRounded !== null ? animatedBmi.toFixed(1).replace('.', ',') : '—'}</p>
          <p className={`mb-1.5 text-[15px] font-semibold ${bmiCategory.colorClass}`}>{bmiCategory.label}</p>
        </div>

        <div className="relative mt-5 pt-4">
          {bmiRounded !== null ? (
            <div
              className="absolute top-0 -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ left: `${markerPercent}%` }}
              aria-hidden="true"
            >
              <div className="h-0 w-0 border-x-[7px] border-b-[9px] border-x-transparent border-b-text-primary drop-shadow-md" />
            </div>
          ) : null}
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full opacity-80">
            {bmiZoneWidths.map((zone) => (
              <div
                key={zone.label}
                className="h-full"
                style={{ width: `${zone.widthPercent}%`, backgroundColor: zone.color }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-text-secondary">
            {BMI_ZONES.map((zone) => (
              <span key={zone.label}>{zone.label}</span>
            ))}
          </div>
        </div>

        {settings.height > 0 && bmiStats.count > 0 ? (
          <div className="mt-5 flex items-center border-t border-white/10 pt-4">
            <div className="stat-row-item border-r border-white/10">
              <span className="stat-row-value text-text-primary">{formatBmi(bmiStats.min)}</span>
              <span className="stat-row-label">Minimum</span>
            </div>
            <div className="stat-row-item border-r border-white/10">
              <span className="stat-row-value text-text-primary">{formatBmi(bmiStats.avg)}</span>
              <span className="stat-row-label">Moyenne</span>
            </div>
            <div className="stat-row-item">
              <span className={`stat-row-value ${bmiDeltaColor}`}>{bmiDeltaLabel}</span>
              <span className="stat-row-label">Évolution</span>
            </div>
          </div>
        ) : settings.height <= 0 ? (
          <p className="mt-4 text-[13px] text-text-secondary">
            Renseignez votre taille dans les paramètres pour suivre l&apos;évolution de l&apos;IMC.
          </p>
        ) : null}
      </GlassCard>

      {settings.height > 0 ? (
        <GlassCard className="animate-fade-up animate-stagger-3 p-5">
          <p className="mb-4 text-[15px] font-semibold text-text-primary">Évolution de l&apos;IMC</p>
          <BmiChart data={bmiHistory} movingAverage={bmiMovingAverage} />
        </GlassCard>
      ) : null}

      {/* Quick stats */}
      <GlassCard size="sm" className="animate-fade-up animate-stagger-4 px-4 py-4">
        <div className="flex items-center">
          <div className="stat-row-item border-r border-white/10">
            <span className="stat-row-value text-text-primary">{weights.length ? formatWeightWithUnit(minWeight, settings.unit) : '—'}</span>
            <span className="stat-row-label">Minimum</span>
          </div>
          <div className="stat-row-item border-r border-white/10">
            <span className="stat-row-value text-text-primary">{weights.length ? formatWeightWithUnit(avgWeight, settings.unit) : '—'}</span>
            <span className="stat-row-label">Moyenne</span>
          </div>
          <div className="stat-row-item">
            <span className="stat-row-value text-text-primary">{filteredEntries.length}</span>
            <span className="stat-row-label">Pesées</span>
          </div>
        </div>
      </GlassCard>

      {/* Plan section */}
      {plan ? (
        <div className="animate-fade-up animate-stagger-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-label">Plan</p>
            <button
              type="button"
              onClick={onEditPlan}
              className="press-button -my-2 min-h-11 px-2 text-[15px] font-semibold text-accent-text"
            >
              Modifier
            </button>
          </div>

          <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-[15px] font-medium text-text-primary">Rythme cible</p>
                <p className="mt-0.5 text-[13px] text-text-secondary">
                  {currentRate != null && currentRate > 0
                    ? `Actuel : ${formatPace(currentRate, settings.unit)}`
                    : 'Pas encore de données'}
                </p>
              </div>
              <p className="text-[17px] font-semibold tabular-nums text-plan">{formatPace(plan.weeklyPace, settings.unit)}</p>
            </div>

            {nextCheckpoint ? (
              <div className="mx-4 flex items-center justify-between border-t border-white/10 py-4">
                <div>
                  <p className="text-[15px] font-medium text-text-primary">Prochain palier</p>
                  <p className="mt-0.5 text-[13px] text-text-secondary">{formatDatePlanShort(nextCheckpoint.date)}</p>
                </div>
                <p className="text-[17px] font-semibold tabular-nums text-text-primary">
                  {formatWeightWithUnit(nextCheckpoint.weight, settings.unit)}
                </p>
              </div>
            ) : null}

            <div className="mx-4 flex items-center justify-between border-t border-white/10 py-4">
              <div>
                <p className="text-[15px] font-medium text-text-primary">Objectif final</p>
                <p className="mt-0.5 text-[13px] text-text-secondary">{formatDatePlanShort(plan.endDate)}</p>
              </div>
              <p className="text-[17px] font-semibold tabular-nums text-goal">
                {formatWeightWithUnit(plan.targetWeight, settings.unit)}
              </p>
            </div>
          </GlassCard>
        </div>
      ) : entries.length > 0 ? (
        <GlassCard className="animate-fade-up animate-stagger-5 flex flex-col items-center px-5 py-8 text-center">
          <p className="text-[15px] font-semibold text-text-primary">Pas encore de plan</p>
          <p className="mt-1.5 text-[13px] text-text-secondary">Définissez un rythme pour voir vos jalons.</p>
          {projectedDate ? (
            <p className="mt-3 text-[13px] text-text-secondary">
              À ce rythme, objectif vers le <span className="font-medium text-text-primary">{projectedDate}</span>
            </p>
          ) : null}
          <GlassButton onClick={onEditPlan} className="mt-5">
            Créer un plan
          </GlassButton>
        </GlassCard>
      ) : null}

      {/* Mensurations */}
      {onSaveMeasurement ? (
        <MeasurementsCard
          measurements={measurements}
          challengeStartDate={settings.challengeStartDate}
          onSave={onSaveMeasurement}
          onDeleteMany={onDeleteMeasurements}
        />
      ) : null}

      {/* Badges */}
      {badges ? <BadgesShowcase badges={badges} /> : null}
    </section>
  )
}

export default ProgressScreen
