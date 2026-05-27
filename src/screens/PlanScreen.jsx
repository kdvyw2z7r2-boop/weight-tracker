import { useMemo } from 'react'
import PlanChart from '../components/PlanChart'
import { formatDatePlanShort } from '../utils/locale'
import {
  computeActualRates,
  computeWeeklyRates,
  computeWeightPlan,
  formatPace,
  formatWeight,
  getNextCheckpoint,
} from '../utils/weightPlan'

function RateCard({ label, value, active = false }) {
  return (
    <div
      className={`min-w-0 flex-1 rounded-2xl px-3 py-3 ${
        active ? 'bg-bg-elevated ring-1 ring-white/10' : 'bg-bg-card'
      }`}
    >
      <p className="truncate text-[11px] text-text-tertiary">{label}</p>
      <p className="mt-1 truncate text-[14px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  )
}

function PlanScreen({ entries, settings, onEditPlan }) {
  const sortedAsc = useMemo(
    () => [...entries].sort((a, b) => (a.date > b.date ? 1 : -1)),
    [entries],
  )
  const latest = entries[0]
  const firstEntry = sortedAsc[0]
  const startWeight = latest?.weight ?? firstEntry?.weight
  const startDate = latest?.date ?? firstEntry?.date

  const plan = useMemo(() => {
    if (!settings.weeklyPace || !startWeight || !startDate) return null
    return computeWeightPlan({
      startWeight,
      targetWeight: settings.targetWeight,
      weeklyPace: settings.weeklyPace,
      startDate,
    })
  }, [settings.weeklyPace, settings.targetWeight, startWeight, startDate])

  const nextCheckpoint = getNextCheckpoint(plan)
  const { currentRate, overallRate } = computeActualRates(entries, startDate)
  const weeklyRates = useMemo(() => computeWeeklyRates(entries, plan), [entries, plan])

  if (!latest) {
    return (
      <section className="space-y-4">
        <header className="animate-fade-up">
          <h1 className="text-[18px] font-semibold">Plan de poids</h1>
          <p className="mt-0.5 text-[13px] text-text-tertiary">Définissez votre trajectoire</p>
        </header>
        <div className="card-base flex flex-col items-center py-12 text-center">
          <p className="text-base font-medium">Aucune pesée enregistrée</p>
          <p className="mt-2 max-w-[260px] text-[14px] text-text-tertiary">
            Ajoutez votre première pesée pour créer un plan avec des points de contrôle.
          </p>
        </div>
      </section>
    )
  }

  if (!plan) {
    return (
      <section className="space-y-4">
        <header className="animate-fade-up">
          <h1 className="text-[18px] font-semibold">Plan de poids</h1>
          <p className="mt-0.5 text-[13px] text-text-tertiary">Définissez votre trajectoire</p>
        </header>
        <div className="card-base flex flex-col items-center py-12 text-center">
          <p className="text-base font-medium">Configurez votre rythme</p>
          <p className="mt-2 max-w-[260px] text-[14px] text-text-tertiary">
            Choisissez un rythme de perte pour calculer vos points de contrôle jusqu&apos;à l&apos;objectif.
          </p>
          <button
            type="button"
            onClick={onEditPlan}
            className="mt-6 h-12 rounded-[14px] bg-[#A78BFA] px-8 text-[15px] font-semibold text-white"
          >
            Définir le rythme
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <header className="animate-fade-up">
        <h1 className="text-[18px] font-semibold">Plan de poids</h1>
      </header>

      <div className="animate-fade-up animate-stagger-1 flex gap-2 overflow-x-auto pb-1">
        <RateCard label="Rythme de l'objectif" value={formatPace(plan.weeklyPace)} active />
        <RateCard
          label="Rythme actuel"
          value={currentRate != null && currentRate > 0 ? formatPace(currentRate) : '— kg/sem.'}
        />
        <RateCard
          label="Rythme général"
          value={overallRate != null && overallRate > 0 ? formatPace(overallRate) : '— kg/sem.'}
        />
      </div>

      <div className="card-base animate-fade-up animate-stagger-2 overflow-hidden p-3">
        <PlanChart plan={plan} unit={settings.unit} />
      </div>

      <div className="card-base animate-fade-up animate-stagger-3 space-y-4">
        <p className="text-[14px] text-text-secondary">
          À un rythme de {formatPace(plan.weeklyPace)}, vous atteindrez :
        </p>

        {nextCheckpoint ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-xl">🏁</span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-white">Prochain point de contrôle</p>
                <p className="text-[13px] text-text-tertiary">{formatDatePlanShort(nextCheckpoint.date)}</p>
              </div>
            </div>
            <p className="shrink-0 text-[18px] font-bold tabular-nums">
              {formatWeight(nextCheckpoint.weight, settings.unit)} {settings.unit}
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-xl">🏆</span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-white">Objectif</p>
              <p className="text-[13px] text-[#FBBF24]">{formatDatePlanShort(plan.endDate)}</p>
            </div>
          </div>
          <p className="shrink-0 text-[18px] font-bold tabular-nums text-[#FBBF24]">
            {formatWeight(plan.targetWeight, settings.unit)} {settings.unit}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onEditPlan}
        className="press-button w-full text-center text-[15px] font-medium text-[#A78BFA]"
      >
        Ajuster l&apos;objectif et le rythme
      </button>

      <div className="animate-fade-up animate-stagger-4">
        <p className="section-label mb-3">Rythme par semaine</p>
        <div className="card-base divide-y divide-border p-0">
          {weeklyRates.slice(0, 8).map((week, index) => (
            <div key={week.weekStart} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-[14px] font-medium text-white">
                  {index === 0 ? 'Semaine 1' : `Semaine ${index + 1}`}
                </p>
                <p className="text-[12px] text-text-tertiary">{week.label}</p>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-medium tabular-nums text-white">
                  {week.actualWeight != null
                    ? `${formatWeight(week.actualWeight, settings.unit)} ${settings.unit}`
                    : `${formatWeight(week.expectedWeight, settings.unit)} ${settings.unit}`}
                </p>
                <p className="text-[12px] tabular-nums text-text-tertiary">
                  {week.rate != null && week.rate > 0 ? formatPace(week.rate) : '— kg/sem.'}
                </p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span>🚀</span>
              <div>
                <p className="text-[14px] font-medium text-white">Commencer</p>
                <p className="text-[12px] text-text-tertiary">{formatDatePlanShort(plan.startDate)}</p>
              </div>
            </div>
            <p className="text-[14px] font-medium tabular-nums">
              {formatWeight(plan.startWeight, settings.unit)} {settings.unit}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PlanScreen
