const MODES = [
  { key: 'side', label: 'Côte à côte' },
  { key: 'curtain', label: 'Rideau' },
  { key: 'fade', label: 'Fondu' },
]

function CompareModeSwitch({ value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Mode de comparaison"
      className="inline-flex gap-1 rounded-[20px] bg-bg-elevated/60 p-1"
    >
      {MODES.map((mode) => {
        const active = value === mode.key
        return (
          <button
            key={mode.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode.key)}
            className={`press-button rounded-[18px] px-3.5 py-1.5 text-[13px] font-medium ${
              active ? 'bg-white text-black' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}

export default CompareModeSwitch
