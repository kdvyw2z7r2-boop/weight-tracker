import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { formatDateShort } from '../utils/locale'

function ProgressRing({ startWeight, startDate, currentWeight, targetWeight, unit, entriesCount = 0 }) {
  const size = 160
  const radius = size / 2
  const stroke = 8
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
    <div className="card-base card-glow animate-fade-up animate-stagger-2 flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1 text-[13px] leading-snug text-text-tertiary">
        <p className="section-label !normal-case !tracking-normal !text-[11px]">Départ</p>
        <p className="mt-1.5 text-[15px] font-medium text-text-primary">
          {startWeight} {unit}
        </p>
        {startDate ? <p className="mt-0.5 text-[12px]">{formatDateShort(startDate)}</p> : null}
      </div>

      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block -rotate-90">
          <circle
            stroke="#1E1E1E"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00e5ff" />
              <stop offset="100%" stopColor="#bf00ff" />
            </linearGradient>
          </defs>
          <circle
            stroke={isPositiveProgress ? 'url(#ring-gradient)' : '#222222'}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{
              strokeDashoffset,
              filter: isPositiveProgress ? 'drop-shadow(0 0 8px rgba(0,229,255,0.6))' : undefined,
            }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p
            className={`text-3xl font-black leading-none tabular-nums ${
              isPositiveProgress ? 'neon-text-cyan' : 'text-white'
            }`}
          >
            {displayPercent}%
          </p>
          <p className="mt-1 max-w-[90px] text-[12px] leading-tight text-text-tertiary">
            {hasEnoughEntries ? `${currentWeight} / ${targetWeight}` : 'Début du suivi'}
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1 text-right text-[13px] leading-snug text-text-tertiary">
        <p className="section-label !normal-case !tracking-normal !text-[11px]">Objectif</p>
        <p className="mt-1.5 text-[15px] font-medium text-text-primary">
          {targetWeight} {unit}
        </p>
      </div>
    </div>
  )
}

export default ProgressRing
