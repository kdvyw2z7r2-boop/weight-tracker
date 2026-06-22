const accentStyles = {
  cyan: 'from-accent-blue/20 via-accent-blue/5 to-transparent border-accent-blue/30 text-accent-blue',
  green: 'from-accent-green/20 via-accent-green/5 to-transparent border-accent-green/30 text-accent-green',
  red: 'from-accent-red/20 via-accent-red/5 to-transparent border-accent-red/30 text-accent-red',
  purple: 'from-accent-purple/20 via-accent-purple/5 to-transparent border-accent-purple/30 text-accent-purple',
  amber: 'from-accent-amber/20 via-accent-amber/5 to-transparent border-accent-amber/30 text-accent-amber',
}

function MotivationBanner({ greeting, text, tag, accent = 'cyan', delay = 0 }) {
  const style = accentStyles[accent] ?? accentStyles.cyan

  return (
    <div
      className={`motivation-banner animate-fade-up bg-gradient-to-r ${style}`}
      style={{ animationDelay: `${delay * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="data-badge shrink-0">{tag}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-tertiary">{greeting}</p>
          <p className="mt-1 text-[14px] font-medium leading-relaxed text-white">{text}</p>
        </div>
      </div>
    </div>
  )
}

export default MotivationBanner
