import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { formatDateShort } from '../utils/locale'

function ProgressRing({ startWeight, startDate, currentWeight, targetWeight, unit, entriesCount = 0 }) {
  const size = 168
  const radius = size / 2
  const stroke = 9
  const normalizedRadius = radius - stroke * 0.5
  const circumference = normalizedRadius * 2 * Math.PI
  const hasEnoughEntries = entriesCount >= 2
  const denom = startWeight - targetWeight
  const rawProgress = hasEnoughEntries && denom !== 0 ? ((startWeight - currentWeight) / denom) * 100 : 0
  const progress = Math.max(0, Math.min(100, rawProgress))
  const animatedProgress = useAnimatedNumber(progress, 900)
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference
  const isPositiveProgress = progress > 0
  const displayPercent = Math.round(animatedProgress)

  return (
    <div className="hud-card animate-fade-up animate-stagger-3 flex items-center justify-between gap-2 p-5">
      <div className="relative z-10 min-w-0 flex-1 text-[13px] leading-snug text-text-tertiary">
        <p className="section-label">Départ</p>
        <p className="mt-1.5 font-display text-[17px] font-bold text-white">
          {startWeight} <span className="text-[12px] text-text-tertiary">{unit}</span>
        </p>
        {startDate ? <p className="mt-0.5 text-[11px]">{formatDateShort(startDate)}</p> : null}
      </div>

      <div className="progress-hud-ring relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block -rotate-90">
          <circle
            stroke="rgba(255,255,255,0.06)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00e5ff" />
              <stop offset="50%" stopColor="#39ff14" />
              <stop offset="100%" stopColor="#bf00ff" />
            </linearGradient>
            <filter id="ring-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            className="ring-progress"
            stroke={isPositiveProgress ? 'url(#ring-gradient)' : '#222222'}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{
              strokeDashoffset,
              filter: isPositiveProgress ? 'url(#ring-glow)' : undefined,
              '--ring-circumference': circumference,
            }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p
            className={`font-display text-[34px] font-black leading-none tabular-nums ${
              isPositiveProgress ? 'neon-text-cyan' : 'text-white'
            }`}
          >
            {displayPercent}%
          </p>
          <p className="mt-1 max-w-[90px] text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            {hasEnoughEntries ? 'Objectif' : 'Début'}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-text-secondary">
            {hasEnoughEntries ? `${currentWeight} → ${targetWeight}` : 'Suivi actif'}
          </p>
        </div>
      </div>

      <div className="relative z-10 min-w-0 flex-1 text-right text-[13px] leading-snug text-text-tertiary">
        <p className="section-label">Cible</p>
        <p className="mt-1.5 font-display text-[17px] font-bold neon-text-amber">
          {targetWeight} <span className="text-[12px] text-text-tertiary">{unit}</span>
        </p>
      </div>
    </div>
  )
}

export default ProgressRing
