import { useEffect, useId, useRef, useState } from 'react'
import useDialogBasics from '../hooks/useDialogBasics'
import { formatDateEntry } from '../utils/locale'
import { formatWeightWithUnit } from '../utils/format'

/** Vue en grand, lecture seule : les actions (recadrer, remplacer, supprimer) vivent dans la feuille « … » de la frise. */
function PhotoViewerModal({ isOpen, onClose, date, photoUrl, weight, unit = 'kg' }) {
  const [render, setRender] = useState(false)
  const [visible, setVisible] = useState(false)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const titleId = useId()
  useDialogBasics({ open: isOpen, onClose, containerRef: dialogRef, initialFocusRef: closeRef })

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- modal mount animation
      setRender(true)
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    const timer = setTimeout(() => setRender(false), 300)
    return () => clearTimeout(timer)
  }, [isOpen])

  if (!render) return null

  return (
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center sm:items-center ${isOpen ? '' : 'pointer-events-none'}`}
      inert={!isOpen}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer"
        onClick={onClose}
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`glass-strong relative w-full max-w-md !rounded-b-none px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 transition-[opacity,translate] duration-300 sm:!rounded-b-[28px] ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-[13px] font-medium text-text-secondary">
              {formatDateEntry(date)}
            </h2>
            {weight != null ? (
              <p className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums text-text-primary">
                {formatWeightWithUnit(weight, unit)}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="press-button glass-icon-btn shrink-0"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative mx-auto mt-5 aspect-[9/16] max-h-[60vh] overflow-hidden rounded-[20px] border border-white/15 bg-white/5">
          {photoUrl ? (
            <img src={photoUrl} alt={`Photo du ${date}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-text-secondary">Aucune photo</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PhotoViewerModal
