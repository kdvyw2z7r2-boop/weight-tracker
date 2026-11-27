import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  tone = 'default',
  onConfirm,
  onCancel,
}) {
  const [render, setRender] = useState(false)
  const [visible, setVisible] = useState(false)
  const cancelRef = useRef(null)
  const returnFocusRef = useRef(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement
      // eslint-disable-next-line react-hooks/set-state-in-effect -- modal mount animation
      setRender(true)
      document.body.style.overflow = 'hidden'
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => {
        cancelAnimationFrame(frame)
        document.body.style.overflow = ''
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
    if (open && visible) cancelRef.current?.focus()
  }, [open, visible])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!render) return null

  const confirmClass =
    tone === 'danger' ? 'rounded-full bg-danger font-semibold text-bg-primary' : 'btn-primary'

  // Portail : toujours au-dessus de la barre d'onglets, quel que soit l'écran appelant.
  return createPortal(
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center sm:items-center ${
        open ? '' : 'pointer-events-none'
      }`}
      inert={!open}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer"
        onClick={onCancel}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        className={`glass-strong relative w-full max-w-md !rounded-b-none px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 transition-[opacity,translate] duration-300 sm:!rounded-b-[28px] ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />
        <h2 id={titleId} className="text-center text-[17px] font-semibold text-text-primary">
          {title}
        </h2>
        {message ? (
          <p id={messageId} className="mt-2 text-center text-[14px] leading-relaxed text-text-secondary">
            {message}
          </p>
        ) : null}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`press-button h-12 w-full text-[15px] ${confirmClass}`}
          >
            {confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="press-button h-12 w-full rounded-full border border-white/15 bg-white/8 text-[15px] font-semibold text-text-primary"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmSheet
