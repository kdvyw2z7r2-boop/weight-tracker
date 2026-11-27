import { useId, useMemo, useRef, useState } from 'react'
import PlanChart from './PlanChart'
import GlassButton from './ui/GlassButton'
import useDialogBasics from '../hooks/useDialogBasics'
import {
  computeWeightPlan,
  getPaceRange,
} from '../utils/weightPlan'
import { formatPace, formatWeightWithUnit } from '../utils/format'

function WeightPlanModal({ isOpen, onClose, onSave, onRemove, startWeight, targetWeight, startDate, weeklyPace, unit }) {
  const range = getPaceRange(unit)
  const initialPace = weeklyPace ?? range.defaultPace
  const [pace, setPace] = useState(initialPace)
  const dialogRef = useRef(null)
  const titleId = useId()
  useDialogBasics({ open: isOpen, onClose, containerRef: dialogRef })

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

  const { min: paceMin, max: paceMax } = range
  const recommendedLeft = ((range.recommendedMin - paceMin) / (paceMax - paceMin)) * 100
  const recommendedWidth = ((range.recommendedMax - range.recommendedMin) / (paceMax - paceMin)) * 100

  const handleSave = () => {
    onSave({
      weeklyPace: pace,
      planSetupComplete: true,
      planStartDate: startDate,
      planStartWeight: startWeight,
    })
    onClose()
  }

  const handleRemove = () => {
    onRemove?.()
    onClose()
  }

  const pacePercent = ((pace - paceMin) / (paceMax - paceMin)) * 100

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/50 pt-[calc(0.5rem+env(safe-area-inset-top,0px))]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-strong animate-modal-sheet mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col !rounded-b-none"
      >
        <header className="flex items-center justify-between px-4 pb-2 pt-3">
          <button type="button" onClick={onClose} aria-label="Fermer" className="press-button glass-icon-btn text-lg">
            ✕
          </button>
          <h2 id={titleId} className="text-[17px] font-semibold text-text-primary">
            Planificateur de poids
          </h2>
          <span className="w-11" aria-hidden="true" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {/* Pas de verre imbriqué dans la feuille : simple surface translucide. */}
          <div className="mt-2 overflow-hidden rounded-[20px] border border-white/10 bg-white/5 p-3">
            <PlanChart plan={previewPlan} unit={unit} compact />
          </div>

          <div className="mt-8">
            <h3 className="text-[22px] font-semibold tracking-[-0.01em] text-text-primary">Définir votre rythme</h3>
            <p className="mt-4 text-[15px] text-text-secondary">Je m&apos;engage à perdre</p>
            <p className="mt-1 text-[34px] font-semibold tracking-[-0.02em] tabular-nums text-text-primary">
              {formatPace(pace, unit)}
            </p>
            <p className="mt-1 text-[13px] text-plan">Intervalle recommandé</p>

            <div className="relative mt-5 flex h-11 items-center">
              <div className="relative h-1.5 w-full rounded-full bg-track">
                <div
                  className="absolute top-0 h-full rounded-full bg-plan/35"
                  style={{ left: `${recommendedLeft}%`, width: `${recommendedWidth}%` }}
                />
                <div className="absolute top-0 h-full rounded-full bg-accent" style={{ width: `${pacePercent}%` }} />
              </div>
              <input
                type="range"
                min={paceMin}
                max={paceMax}
                step={range.step}
                value={pace}
                onChange={(event) => setPace(Number(event.target.value))}
                className="peer absolute inset-0 h-11 w-full cursor-pointer opacity-0"
                aria-label="Rythme hebdomadaire"
              />
              <div
                className="pointer-events-none absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border-2 border-accent bg-text-primary shadow-lg peer-focus-visible:ring-4 peer-focus-visible:ring-accent/40"
                style={{ left: `calc(${pacePercent}% - 14px)` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[12px] text-text-secondary">
              <span>{formatPace(paceMin, unit)}</span>
              <span>{formatPace(paceMax, unit)}</span>
            </div>

            {previewPlan ? (
              <div className="mt-6 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-[13px] text-text-secondary">
                <p>
                  Objectif de <span className="text-text-primary">{formatWeightWithUnit(startWeight, unit)}</span> à{' '}
                  <span className="text-text-primary">{formatWeightWithUnit(targetWeight, unit)}</span>
                </p>
                <p className="mt-1">
                  {previewPlan.checkpoints.length} point{previewPlan.checkpoints.length > 1 ? 's' : ''} de contrôle ·{' '}
                  {Math.round(previewPlan.totalWeeks)} semaines
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/10 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4">
          {weeklyPace != null ? (
            <button
              type="button"
              onClick={handleRemove}
              className="press-button mb-2 min-h-11 w-full text-[15px] font-semibold text-danger-text"
            >
              Retirer le rythme de l&apos;objectif
            </button>
          ) : null}
          <GlassButton size="lg" onClick={handleSave} className="w-full">
            Enregistrer
          </GlassButton>
        </div>
      </div>
    </div>
  )
}

export default WeightPlanModal
