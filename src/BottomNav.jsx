import { useLayoutEffect, useRef, useState } from 'react'

const tabs = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="10" width="18" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        <circle cx="12" cy="15" r="2" />
      </svg>
    ),
  },
  {
    id: 'log',
    label: 'Journal',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
        <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'Progrès',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M3 17l4-8 4 4 4-6 4 3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7" cy="9" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="11" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="7" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="19" cy="10" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Réglages',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="3" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

function BottomNav({ current, onChange }) {
  const containerRef = useRef(null)
  const buttonRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const button = buttonRefs.current[current]
    const container = containerRef.current
    if (!button || !container) return
    const containerRect = container.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()
    setIndicator({
      left: buttonRect.left - containerRect.left + buttonRect.width / 2 - 16,
      width: 32,
    })
  }, [current])

  return (
    <nav className="nav-glass fixed bottom-0 left-0 right-0 z-20 pb-[env(safe-area-inset-bottom)]">
      <div ref={containerRef} className="relative mx-auto grid h-16 w-full max-w-md grid-cols-4">
        <span
          className="nav-indicator absolute top-0 h-[2px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            left: indicator.left,
            width: indicator.width,
            background: 'linear-gradient(90deg, #00e5ff, #bf00ff)',
            boxShadow: '0 0 8px rgba(0,229,255,0.8)',
          }}
          aria-hidden="true"
        />
        {tabs.map((tab) => {
          const active = current === tab.id
          return (
            <button
              key={tab.id}
              ref={(node) => {
                buttonRefs.current[tab.id] = node
              }}
              type="button"
              onClick={() => onChange(tab.id)}
              style={active ? { color: '#00e5ff', filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.5))' } : undefined}
              className={`press-button flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                active ? '' : 'text-text-tertiary'
              }`}
            >
              {tab.icon()}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
