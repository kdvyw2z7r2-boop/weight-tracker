import { useEffect, useId, useRef, useState } from 'react'
import { useDialogLayer } from '../../hooks/dialogStack'
import { formatWeightWithUnit } from '../../utils/format'
import { formatDateEntry } from '../../utils/locale'

// Boutons non vitrés : pas de verre imbriqué dans la feuille .glass-strong.
const ACTION_CLASS =
  'press-button h-12 w-full rounded-full border border-white/15 bg-white/8 text-[15px] font-semibold text-text-primary disabled:opacity-40'

/** Feuille « … » d'une vignette : Voir en grand, Recadrer, Remplacer, Supprimer. */
function PhotoOptionsSheet({ open, photo, unit = 'kg', onClose, onView, onRecrop, onReplace, onDelete }) {
  const [render, setRender] = useState(false)
  const [visible, setVisible] = useState(false)
  // Dernière photo affichée : la feuille garde son contenu pendant l'animation de fermeture.
  const [shown, setShown] = useState(photo)
  const firstRef = useRef(null)
  const returnFocusRef = useRef(null)
  const titleId = useId()

  if (photo && photo !== shown) setShown(photo)

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement
      // eslint-disable-next-line react-hooks/set-state-in-effect -- modal mount animation
      setRender(true)
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => {
        cancelAnimationFrame(frame)
      }
    }
    setVisible(false)
    const toRestore = returnFocusRef.current
    returnFocusRef.current = null
    if (toRestore instanceof HTMLElement && toRestore.isConnected) toRestore.focus()
    const timer = setTimeout(() => setRender(false), 300)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (open && visible) firstRef.current?.focus()
  }, [open, visible])

  useDialogLayer(open, { onEscape: onClose })

  if (!render || !shown) return null

  return (
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center sm:items-center ${open ? '' : 'pointer-events-none'}`}
      inert={!open}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer"
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`glass-strong relative w-full max-w-md !rounded-b-none px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 transition-[opacity,translate] duration-300 sm:!rounded-b-[28px] ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />
        <h2 id={titleId} className="text-center text-[17px] font-semibold text-text-primary">
          {formatDateEntry(shown.date)}
        </h2>
        <p className="mt-0.5 text-center text-[14px] tabular-nums text-text-secondary">
          {formatWeightWithUnit(shown.weight, unit)}
        </p>
        <div className="mt-5 space-y-2">
          <button ref={firstRef} type="button" onClick={() => onView(shown)} disabled={!shown.url} className={ACTION_CLASS}>
            Voir en grand
          </button>
          <button type="button" onClick={() => onRecrop(shown)} disabled={!shown.url} className={ACTION_CLASS}>
            Recadrer
          </button>
          <button type="button" onClick={() => onReplace(shown)} className={ACTION_CLASS}>
            Remplacer
          </button>
          <button
            type="button"
            onClick={() => onDelete(shown)}
            className="press-button btn-glass-danger h-12 w-full text-[15px]"
          >
            Supprimer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="press-button h-12 w-full rounded-full text-[15px] font-semibold text-text-secondary"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

export default PhotoOptionsSheet
