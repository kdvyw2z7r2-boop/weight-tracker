import { useId, useState } from 'react'
import { parseBoundedNumber } from '../utils/number'

const inputClass =
  'h-12 w-full rounded-xl border border-transparent bg-bg-card px-4 text-base text-white outline-none transition duration-200 focus:border-white/20'

function NumberField({ label, value, min, max, format, onCommit }) {
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
    const parsed = parseBoundedNumber(draft, { min, max })
    if (parsed === null) {
      setDraft(display)
      return
    }
    if (parsed !== Number(value)) onCommit(parsed)
    setDraft(format(parsed))
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
