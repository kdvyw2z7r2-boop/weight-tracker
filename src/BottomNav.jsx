const tabs = [
  {
    id: 'dashboard',
    label: 'Poids',
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
    id: 'photos',
    label: 'Photos',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path
          d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13" r="3.5" />
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
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
      <div className="glass glass-bar pointer-events-auto mx-auto grid h-16 w-full max-w-md grid-cols-5 gap-1 p-1.5">
        {tabs.map((tab) => {
          const active = current === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`press-button flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[22px] ${
                active ? 'bg-white/14 text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]' : 'text-text-secondary'
              }`}
            >
              <span className={active ? 'text-accent' : undefined}>{tab.icon()}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
