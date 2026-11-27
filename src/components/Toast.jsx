import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToastContext } from '../hooks/useToast'

const TONE_CLASS = {
  default: 'text-text-primary',
  success: 'text-good-text',
  error: 'text-danger-text',
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)
  const idRef = useRef(0)

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  const show = useCallback((message, { tone = 'default', action, duration = 4000 } = {}) => {
    clearTimeout(timerRef.current)
    idRef.current += 1
    setToast({ id: idRef.current, message, tone, action })
    timerRef.current = setTimeout(() => setToast(null), duration)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Marge droite = colonne du FAB (right 1.25rem + 56px + 12px d'écart) : le toast ne le recouvre jamais. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h)+12px)] z-[70] flex justify-center pl-4 pr-[calc(1.25rem+56px+12px)]"
      >
        {toast ? (
          <div
            key={toast.id}
            role="status"
            className={`glass-strong animate-scale-in pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-2 ${TONE_CLASS[toast.tone] ?? TONE_CLASS.default}`}
          >
            <p className="py-2 text-[14px] font-medium">{toast.message}</p>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action.onClick()
                  dismiss()
                }}
                className="press-button flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl px-3 text-[14px] font-semibold text-accent-text"
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
