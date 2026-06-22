import MiniSparkline from './MiniSparkline'

const accentMap = {
  cyan: { text: 'neon-text-cyan', glow: 'stat-orb-cyan', spark: '#00e5ff' },
  green: { text: 'neon-text-green', glow: 'stat-orb-green', spark: '#39ff14' },
  red: { text: 'neon-text-red', glow: 'stat-orb-red', spark: '#ff3131' },
  purple: { text: 'neon-text-purple', glow: 'stat-orb-purple', spark: '#bf00ff' },
  amber: { text: 'neon-text-amber', glow: 'stat-orb-amber', spark: '#ffaa00' },
  white: { text: 'text-white', glow: 'stat-orb-white', spark: '#ffffff' },
}

function StatOrb({ label, value, unit, sublabel, accent = 'cyan', sparkData = [], delay = 0 }) {
  const style = accentMap[accent] ?? accentMap.cyan

  return (
    <div
      className={`stat-orb ${style.glow} animate-fade-up`}
      style={{ animationDelay: `${delay * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="section-label !text-[9px]">{label}</p>
        {sparkData.length > 1 ? (
          <MiniSparkline data={sparkData} color={style.spark} width={56} height={22} />
        ) : null}
      </div>
      <p className={`mt-2 font-display text-[22px] font-bold leading-none tabular-nums ${style.text}`}>
        {value}
        {unit ? <span className="ml-1 text-[11px] font-medium text-text-tertiary">{unit}</span> : null}
      </p>
      {sublabel ? <p className="mt-1.5 text-[10px] text-text-tertiary">{sublabel}</p> : null}
    </div>
  )
}

export default StatOrb
