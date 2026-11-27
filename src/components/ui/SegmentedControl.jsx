import { useRef } from 'react'
import { nextSegmentIndex, tabStopIndex } from '../../utils/segmented'

/**
 * Contrôle segmenté en verre (radiogroup) : flèches ←/→ (et ↑/↓, Home/End) déplacent le focus et
 * sélectionnent, tabindex itinérant (un seul arrêt Tab), segments ≥ 44 px de haut.
 */
function SegmentedControl({ options, value, onChange, ariaLabel, className = '' }) {
  const refs = useRef([])
  const values = options.map((option) => option.value)
  const current = values.indexOf(value)
  const tabStop = tabStopIndex(values, value)

  const handleKeyDown = (event) => {
    const next = nextSegmentIndex(event.key, current, options.length)
    if (next == null) return
    event.preventDefault()
    refs.current[next]?.focus()
    if (next !== current) onChange(options[next].value)
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} onKeyDown={handleKeyDown} className={`glass-track ${className}`}>
      {options.map((option, index) => {
        const checked = index === current
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === tabStop ? 0 : -1}
            onClick={() => {
              if (!checked) onChange(option.value)
            }}
            className={`press-button flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full px-3 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
              checked ? 'glass-segment-active' : 'text-text-secondary'
            }`}
          >
            <span className="truncate">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
