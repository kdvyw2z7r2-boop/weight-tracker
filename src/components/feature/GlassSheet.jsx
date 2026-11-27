import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion'
import { useDialogLayer } from '../../hooks/dialogStack'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select, textarea, [href], [tabindex]:not([tabindex="-1"])'

/**
 * Feuille en verre (`.glass-strong`) rendue dans document.body : Escape ferme, focus déplacé à
 * l'ouverture (initialFocusRef ou 1er élément focalisable) puis restauré, défilement verrouillé,
 * piège de tabulation, pas d'animation si prefers-reduced-motion.
 */
function GlassSheet({ open, title, subtitle, onClose, initialFocusRef, children, labelledBy, dialogKind }) {
  const reducedMotion = usePrefersReducedMotion()
  const [render, setRender] = useState(open)
  const [visible, setVisible] = useState(false)
  const panelRef = useRef(null)
  const returnFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  })
  useDialogLayer(open, { onEscape: onClose, kind: dialogKind })

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement
      // eslint-disable-next-line react-hooks/set-state-in-effect -- montage animé de la feuille
      setRender(true)
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      return () => {
        cancelAnimationFrame(frame)
      }
    }
    setVisible(false)
    const toRestore = returnFocusRef.current
    returnFocusRef.current = null
    if (toRestore instanceof HTMLElement && toRestore.isConnected) toRestore.focus()
    const timer = setTimeout(() => setRender(false), reducedMotion ? 0 : 300)
    return () => clearTimeout(timer)
  }, [open, reducedMotion])

  useEffect(() => {
    if (!open || !visible) return
    const target = initialFocusRef?.current ?? panelRef.current?.querySelector(FOCUSABLE)
    target?.focus()
  }, [open, visible, initialFocusRef])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!render) return null

  const transition = reducedMotion ? '' : 'transition-all duration-300'

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center ${open ? '' : 'pointer-events-none'}`}
      inert={!open}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer"
        onClick={() => onCloseRef.current?.()}
        className={`absolute inset-0 bg-black/60 ${reducedMotion ? '' : 'transition-opacity duration-300'} ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        className={`glass-strong relative mx-2 mb-2 flex max-h-[calc(100dvh-24px)] w-full max-w-md flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] ${transition} ${
          visible ? 'translate-y-0 opacity-100' : reducedMotion ? 'opacity-0' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="overflow-y-auto px-5 pb-5 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-track sm:hidden" aria-hidden="true" />
          {title ? (
            <h2 id={titleId} className="text-[20px] font-semibold text-text-primary">
              {title}
            </h2>
          ) : null}
          {subtitle ? <p className="mt-1 text-[14px] text-text-secondary">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default GlassSheet
