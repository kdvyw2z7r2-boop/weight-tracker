function ProgressRing({ startWeight, currentWeight, targetWeight, entriesCount = 0 }) {
  const radius = 56
  const stroke = 10
  const normalizedRadius = radius - stroke * 0.5
  const circumference = normalizedRadius * 2 * Math.PI
  const hasEnoughEntries = entriesCount >= 2
  const denom = startWeight - targetWeight
  const rawProgress = hasEnoughEntries && denom !== 0 ? ((startWeight - currentWeight) / denom) * 100 : 0
  const progress = Math.max(0, Math.min(100, rawProgress))
  const strokeDashoffset = circumference - (progress / 100) * circumference
  const isPositiveProgress = progress > 0

  return (
    <div className="flex items-center justify-center rounded-2xl bg-bg-card p-5">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#2A2A2A"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={isPositiveProgress ? '#4ADE80' : '#374151'}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.35s' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <div className="ml-4">
        <p className={`text-2xl font-bold ${isPositiveProgress ? 'text-green-400' : ''}`}>{progress.toFixed(0)}%</p>
        <p className="text-sm text-text-secondary">{hasEnoughEntries ? `${currentWeight} / ${targetWeight}` : 'Début du suivi'}</p>
      </div>
    </div>
  )
}

export default ProgressRing
