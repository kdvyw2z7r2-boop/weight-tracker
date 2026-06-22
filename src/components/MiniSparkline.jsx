import { useMemo } from 'react'

function MiniSparkline({ data = [], color = '#00e5ff', width = 64, height = 24 }) {
  const path = useMemo(() => {
    if (!data.length) return ''
    const values = data.map((item) => (typeof item === 'number' ? item : item.value))
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const step = width / Math.max(values.length - 1, 1)

    return values
      .map((value, index) => {
        const x = index * step
        const y = height - ((value - min) / range) * (height - 4) - 2
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [data, height, width])

  if (!data.length) return null

  return (
    <svg width={width} height={height} className="overflow-visible opacity-80">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L${width},${height} L0,${height} Z`}
        fill={`url(#spark-${color.replace('#', '')})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
    </svg>
  )
}

export default MiniSparkline
