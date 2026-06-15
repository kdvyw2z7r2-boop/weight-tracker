import { addDays, format } from 'date-fns'
import { useMemo, useState } from 'react'
import PillSelector from '../components/PillSelector'
import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { formatDatePlanShort } from '../utils/locale'
import { getBmi, getBmiCategory } from '../utils/stats'
import {
  computeActualRates,
  computeWeightPlan,
  formatPace,
  formatWeight,
  getNextCheckpoint,
  resolvePlanAnchor,
} from '../utils/weightPlan'

const PERIODS = [
  { key: '1m', label: '1 mois', days: 30 },
  { key: '3m', label: '3 mois', days: 90 },
  { key: '6m', label: '6 mois', days: 180 },
  { key: 'all', label: 'Tout', days: null },
]

function ProgressScreen({ entries, settings, onEditPlan }) {
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

  const bmiZones = [
    { label: 'Maigreur', max: 18.5, color: '#38BDF8' },
    { label: 'Normal', max: 25, color: '#4ADE80' },
    { label: 'Surpoids', max: 30, color: '#FBBF24' },
    { label: 'Obésité', max: 40, color: '#F87171' },
  ]

  // Plan section
  const anchor = resolvePlanAnchor(settings, entries)
  const plan = useMemo(() => {
    if (!settings.weeklyPace || !anchor?.startWeight || !anchor?.startDate) return null
    return computeWeightPlan({
      startWeight: anchor.startWeight,
      targetWeight: settings.targetWeight,
      weeklyPace: settings.weeklyPace,
      startDate: anchor.startDate,
    })
  }, [settings.weeklyPace, settings.targetWeight, settings.planStartDate, settings.planStartWeight, anchor?.startWeight, anchor?.startDate])

  const nextCheckpoint = getNextCheckpoint(plan)
  const { currentRate } = computeActualRates(entries, anchor?.startDate)

  return (
    <section className="space-y-4">
      <div className="animate-fade-up">
        <h2 className="text-[18px] font-semibold">Progrès</h2>
        <p className="mt-0.5 text-[13px] text-text-tertiary">Analyse et objectifs</p>
      </div>

      <div className="animate-fade-up animate-stagger-1">
        <PillSelector options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      {/* BMI card */}
      <div className="card-base card-glow animate-fade-up animate-stagger-2">
        <p className="section-label">IMC</p>
        <div className="flex items-end gap-3 mt-2">
          <p className="hero-weight tabular-nums">{bmiRounded !== null ? animatedBmi.toFixed(1).replace('.', ',') : '—'}</p>
          <p className={`mb-1.5 text-sm font-medium ${bmiCategory.colorClass}`}>{bmiCategory.label}</p>
        </div>

        <div className="relative mt-5 pt-4">
          {bmiRounded !== null ? (
            <div
              className="absolute top-0 -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ left: `${markerPercent}%` }}
              aria-hidden="true"
            >
              <div className="h-0 w-0 border-x-[7px] border-b-[9px] border-x-transparent border-b-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
            </div>
          ) : null}
          <div className="flex h-2.5 overflow-hidden rounded-full">
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

      {/* Quick stats */}
      <div className="card-base animate-fade-up animate-stagger-3">
        <div className="flex items-center">
          <div className="stat-row-item border-r border-border">
            <span className="stat-row-value text-text-primary">{weights.length ? min.toFixed(1).replace('.', ',') : '—'}</span>
            <span className="stat-row-label">Minimum</span>
          </div>
          <div className="stat-row-item border-r border-border">
            <span className="stat-row-value text-text-primary">{weights.length ? avg.toFixed(1).replace('.', ',') : '—'}</span>
            <span className="stat-row-label">Moyenne</span>
          </div>
          <div className="stat-row-item">
            <span className="stat-row-value text-text-primary">{filteredEntries.length}</span>
            <span className="stat-row-label">Pesées</span>
          </div>
        </div>
      </div>

      {/* Plan section */}
      {plan ? (
        <div className="animate-fade-up animate-stagger-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-label">Plan</p>
            <button
              type="button"
              onClick={onEditPlan}
              className="press-button text-[12px] text-accent-purple"
            >
              Modifier
            </button>
          </div>

          <div className="card-base space-y-0 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-[14px] font-medium text-white">Rythme cible</p>
                <p className="text-[12px] text-text-tertiary mt-0.5">
                  {currentRate != null && currentRate > 0
                    ? `Actuel : ${formatPace(currentRate)}`
                    : 'Pas encore de données'}
                </p>
              </div>
              <p className="text-[16px] font-bold text-accent-purple">{formatPace(plan.weeklyPace)}</p>
            </div>

            {nextCheckpoint ? (
              <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                <div>
                  <p className="text-[14px] font-medium text-white">Prochain palier</p>
                  <p className="text-[12px] text-text-tertiary mt-0.5">{formatDatePlanShort(nextCheckpoint.date)}</p>
                </div>
                <p className="text-[16px] font-bold tabular-nums text-white">
                  {formatWeight(nextCheckpoint.weight, settings.unit)} {settings.unit}
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-between px-4 py-4 border-t border-border">
              <div>
                <p className="text-[14px] font-medium text-white">Objectif final</p>
                <p className="text-[12px] text-accent-amber mt-0.5">{formatDatePlanShort(plan.endDate)}</p>
              </div>
              <p className="text-[16px] font-bold tabular-nums text-accent-amber">
                {formatWeight(plan.targetWeight, settings.unit)} {settings.unit}
              </p>
            </div>
          </div>
        </div>
      ) : entries.length > 0 ? (
        <div className="card-base animate-fade-up animate-stagger-4 flex flex-col items-center py-8 text-center">
          <p className="text-[14px] font-medium text-text-primary">Pas encore de plan</p>
          <p className="mt-1.5 text-[13px] text-text-tertiary">Définissez un rythme pour voir vos jalons.</p>
          {projectedDate ? (
            <p className="mt-3 text-[13px] text-text-secondary">
              À ce rythme, objectif vers le <span className="font-medium text-white">{projectedDate}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={onEditPlan}
            className="btn-primary mt-5 h-11 px-6 text-[14px]"
          >
            Créer un plan
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default ProgressScreen
