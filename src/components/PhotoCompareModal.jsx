import { useEffect, useState } from 'react'
import { CompareSlot } from './ProgressCompare'

function PhotoCompareModal({ isOpen, onClose, pair, unit = 'kg' }) {
  const [render, setRender] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- modal mount animation
      setRender(true)
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      document.body.style.overflow = ''
      const timer = setTimeout(() => setRender(false), 300)
      return () => clearTimeout(timer)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!render || !pair) return null

  const weightDelta =
    pair.before.weight != null && pair.after.weight != null
      ? pair.after.weight - pair.before.weight
      : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className={`absolute inset-0 bg-black/85 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`relative w-full max-w-md rounded-t-[24px] border-t border-border bg-bg-card px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] transition-all duration-300 sm:rounded-[24px] sm:border ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-bg-elevated sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Avant / Après</h2>
            {weightDelta != null ? (
              <p
                className={`mt-1 text-[14px] font-medium tabular-nums ${
                  weightDelta <= 0 ? 'text-accent-green' : 'text-accent-red'
                }`}
              >
                {weightDelta > 0 ? '+' : ''}
                {weightDelta.toFixed(1).replace('.', ',')} {unit}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press-button rounded-full p-2 text-text-tertiary hover:text-text-secondary"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-5 flex gap-3">
          <CompareSlot
            label="Avant"
            date={pair.before.date}
            url={pair.before.url}
            weight={pair.before.weight}
            unit={unit}
          />
          <CompareSlot
            label="Après"
            date={pair.after.date}
            url={pair.after.url}
            weight={pair.after.weight}
            unit={unit}
          />
        </div>

        <button type="button" onClick={onClose} className="btn-primary mt-5 h-11 w-full text-[15px]">
          Fermer
        </button>
      </div>
    </div>
  )
}

export default PhotoCompareModal
