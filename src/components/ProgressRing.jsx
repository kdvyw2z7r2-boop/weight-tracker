import GlassCard from './ui/GlassCard'
import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { formatDateShort } from '../utils/locale'
import { formatWeight, formatWeightWithUnit } from '../utils/format'
import { CHART_COLORS as C } from '../utils/chartColors'

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
    <GlassCard className="animate-fade-up animate-stagger-2 flex items-center justify-between gap-2 px-4 py-5">
      <div className="min-w-0 flex-1 text-[13px] leading-snug text-text-secondary">
        <p className="section-label !text-[12px]">Départ</p>
        <p className="mt-1.5 text-[16px] font-semibold text-text-primary">
          {formatWeightWithUnit(startWeight, unit)}
        </p>
        {startDate ? <p className="mt-0.5 text-[12px]">{formatDateShort(startDate)}</p> : null}
      </div>

      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block -rotate-90">
          <circle
            stroke={C.track}
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={isPositiveProgress ? 'var(--color-accent)' : C.track}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p
            className={`text-[32px] font-light leading-none tracking-[-0.03em] tabular-nums ${
              isPositiveProgress ? 'text-accent' : 'text-text-primary'
            }`}
          >
            {displayPercent}%
          </p>
          <p className="mt-1 max-w-[90px] text-[12px] leading-tight text-text-secondary">
            {hasEnoughEntries ? `${formatWeight(currentWeight)} / ${formatWeight(targetWeight)}` : 'Début du suivi'}
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1 text-right text-[13px] leading-snug text-text-secondary">
        <p className="section-label !text-[12px]">Objectif</p>
        <p className="mt-1.5 text-[16px] font-semibold text-text-primary">
          {formatWeightWithUnit(targetWeight, unit)}
        </p>
      </div>
    </GlassCard>
  )
}

export default ProgressRing
