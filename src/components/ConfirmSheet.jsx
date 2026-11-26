import { useEffect, useId, useRef, useState } from 'react'

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
    tone === 'danger' ? 'bg-accent-red text-white' : 'bg-accent-green text-bg-primary'

  return (
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
        className={`absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        className={`relative w-full max-w-md rounded-t-[24px] border-t border-border bg-bg-card px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] transition-all duration-300 sm:rounded-[24px] sm:border ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-bg-elevated sm:hidden" aria-hidden="true" />
        <h2 id={titleId} className="text-lg font-semibold text-white">
          {title}
        </h2>
        {message ? (
          <p id={messageId} className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            {message}
          </p>
        ) : null}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`press-button h-12 w-full rounded-[14px] text-[15px] font-semibold ${confirmClass}`}
          >
            {confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="press-button h-12 w-full rounded-[14px] bg-bg-elevated text-[15px] font-medium text-text-primary"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmSheet
