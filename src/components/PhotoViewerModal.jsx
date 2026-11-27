import { useEffect, useState } from 'react'
import { formatDateEntry } from '../utils/locale'
import { formatWeightWithUnit } from '../utils/format'

/** Vue en grand, lecture seule : les actions (recadrer, remplacer, supprimer) vivent dans la feuille « … » de la frise. */
function PhotoViewerModal({ isOpen, onClose, date, photoUrl, weight, unit = 'kg' }) {
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

  if (!render) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
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
            <p className="text-[13px] text-text-tertiary">{formatDateEntry(date)}</p>
            {weight != null ? (
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                {formatWeightWithUnit(weight, unit)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press-button flex h-11 w-11 items-center justify-center rounded-full text-text-tertiary hover:text-text-secondary"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative mx-auto mt-5 aspect-[9/16] max-h-[60vh] overflow-hidden rounded-2xl border border-border bg-bg-elevated">
          {photoUrl ? (
            <img src={photoUrl} alt={`Photo du ${date}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-text-tertiary">Aucune photo</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PhotoViewerModal
