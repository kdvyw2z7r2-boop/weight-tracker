import { useMemo, useState } from 'react'
import PlanChart from './PlanChart'
import {
  computeWeightPlan,
  DEFAULT_WEEKLY_PACE,
  formatPace,
  formatWeight,
  PACE_MAX,
  PACE_MIN,
  PACE_RECOMMENDED_MAX,
  PACE_RECOMMENDED_MIN,
} from '../utils/weightPlan'

function WeightPlanModal({ isOpen, onClose, onSave, onRemove, startWeight, targetWeight, startDate, weeklyPace, unit }) {
  const initialPace = weeklyPace ?? DEFAULT_WEEKLY_PACE
  const [pace, setPace] = useState(initialPace)

  const previewPlan = useMemo(
    () =>
      computeWeightPlan({
        startWeight,
        targetWeight,
        weeklyPace: pace,
        startDate,
      }),
    [startWeight, targetWeight, pace, startDate],
  )

  if (!isOpen) return null

  const recommendedLeft = ((PACE_RECOMMENDED_MIN - PACE_MIN) / (PACE_MAX - PACE_MIN)) * 100
  const recommendedWidth = ((PACE_RECOMMENDED_MAX - PACE_RECOMMENDED_MIN) / (PACE_MAX - PACE_MIN)) * 100

  const handleSave = () => {
    onSave({ weeklyPace: pace, planSetupComplete: true })
    onClose()
  }

  const handleRemove = () => {
    onRemove?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg-primary">
      <header className="flex items-center justify-between px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="press-button flex h-10 w-10 items-center justify-center rounded-full bg-bg-elevated text-lg text-text-secondary"
        >
          ✕
        </button>
        <h2 className="text-[17px] font-semibold">Planificateur de poids</h2>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-36">
        <div className="card-base mt-2 overflow-hidden p-3">
          <PlanChart plan={previewPlan} unit={unit} compact />
        </div>

        <div className="mt-8">
          <h3 className="font-serif text-[22px] font-normal text-white">Définir votre rythme</h3>
          <p className="mt-4 text-[15px] text-text-secondary">Je m&apos;engage à perdre</p>
          <p className="mt-1 text-[32px] font-bold tabular-nums text-white">{formatPace(pace)}</p>
          <p className="mt-1 text-[13px] text-[#A78BFA]">Intervalle recommandé</p>

          <div className="relative mt-8">
            <div className="relative h-2 rounded-full bg-bg-elevated">
              <div
                className="absolute top-0 h-full rounded-full bg-[#A78BFA]/30"
                style={{ left: `${recommendedLeft}%`, width: `${recommendedWidth}%` }}
              />
              <div
                className="absolute top-0 h-full rounded-full bg-[#A78BFA]"
                style={{ width: `${((pace - PACE_MIN) / (PACE_MAX - PACE_MIN)) * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={PACE_MIN}
              max={PACE_MAX}
              step={0.05}
              value={pace}
              onChange={(event) => setPace(Number(event.target.value))}
              className="absolute inset-0 h-2 w-full cursor-pointer opacity-0"
              aria-label="Rythme hebdomadaire"
            />
            <div
              className="pointer-events-none absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-white shadow-lg"
              style={{ left: `calc(${((pace - PACE_MIN) / (PACE_MAX - PACE_MIN)) * 100}% - 14px)` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[12px] text-text-tertiary">
            <span>{formatPace(PACE_MIN)}</span>
            <span>{formatPace(PACE_MAX)}</span>
          </div>

          {previewPlan ? (
            <div className="mt-6 rounded-2xl bg-bg-elevated/60 px-4 py-3 text-[13px] text-text-secondary">
              <p>
                Objectif de <span className="text-white">{formatWeight(startWeight, unit)}</span> à{' '}
                <span className="text-white">{formatWeight(targetWeight, unit)}</span>
              </p>
              <p className="mt-1">
                {previewPlan.checkpoints.length} point{previewPlan.checkpoints.length > 1 ? 's' : ''} de contrôle ·{' '}
                {Math.round(previewPlan.totalWeeks)} semaines
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg-primary/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 backdrop-blur-xl">
        {weeklyPace != null ? (
          <button
            type="button"
            onClick={handleRemove}
            className="press-button mb-3 w-full text-[15px] font-medium text-accent-red"
          >
            Retirer le rythme de l&apos;objectif
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          className="h-[52px] w-full rounded-[14px] bg-[#A78BFA] text-base font-semibold text-white transition active:opacity-80"
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}

export default WeightPlanModal
