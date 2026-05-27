import { useLayoutEffect, useRef, useState } from 'react'

function PillSelector({ options, value, onChange }) {
  const containerRef = useRef(null)
  const buttonRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const button = buttonRefs.current[value]
    const container = containerRef.current
    if (!button || !container) return
    setIndicator({
      left: button.offsetLeft,
      width: button.offsetWidth,
    })
  }, [value, options])

  return (
    <div ref={containerRef} className="relative inline-flex flex-wrap gap-1 rounded-[20px] bg-bg-elevated/60 p-1">
      <span
        className="absolute top-1 bottom-1 rounded-[18px] bg-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ left: indicator.left, width: indicator.width }}
        aria-hidden="true"
      />
      {options.map((option) => {
        const active = value === option.key
        return (
          <button
            key={option.key}
            ref={(node) => {
              buttonRefs.current[option.key] = node
            }}
            type="button"
            onClick={() => onChange(option.key)}
            className={`press-button relative z-10 rounded-[18px] px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
              active ? 'text-black' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default PillSelector
