const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'log', label: 'Log', icon: '📝' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

function BottomNav({ current, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-bg-card">
      <div className="mx-auto grid h-16 w-full max-w-md grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex flex-col items-center justify-center text-xs transition ${
              current === tab.id ? 'text-white' : 'text-text-secondary'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
