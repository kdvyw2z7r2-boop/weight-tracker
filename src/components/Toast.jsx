import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToastContext } from '../hooks/useToast'

const TONE_CLASS = {
  default: 'border-border text-text-primary',
  success: 'border-accent-green/40 text-accent-green',
  error: 'border-accent-red/50 text-accent-red',
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
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4"
      >
        {toast ? (
          <div
            key={toast.id}
            role="status"
            className={`animate-scale-in pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border bg-bg-elevated px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)] ${TONE_CLASS[toast.tone] ?? TONE_CLASS.default}`}
          >
            <p className="py-2 text-[14px] font-medium">{toast.message}</p>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action.onClick()
                  dismiss()
                }}
                className="press-button flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl px-3 text-[14px] font-bold text-accent-blue"
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
