import { useId, useState } from 'react'
import { resolveCommit } from '../utils/number'

const inputClass =
  'glass-field h-12 w-full px-4 text-base'

function NumberField({ label, value, min, max, decimals, format, onCommit }) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const display = format(value)
  const [draft, setDraft] = useState(display)
  const [lastDisplay, setLastDisplay] = useState(display)

  // Re-sync with the stored value (e.g. after a unit conversion) unless the user is typing.
  if (display !== lastDisplay) {
    setLastDisplay(display)
    if (!focused) setDraft(display)
  }

  const commit = () => {
    const next = resolveCommit(draft, { display, value, min, max, decimals })
    if (next === null) {
      setDraft(display)
      return
    }
    onCommit(next)
    setDraft(format(next))
  }

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          setFocused(false)
          commit()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className={inputClass}
      />
    </div>
  )
}

export default NumberField
