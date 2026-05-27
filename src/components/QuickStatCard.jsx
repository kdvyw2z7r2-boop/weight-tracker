function QuickStatCard({ label, value, sublabel, valueClassName = 'text-text-primary', delay = 0 }) {
  return (
    <div
      className="card-base press-card animate-fade-up min-w-0 flex-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="section-label truncate">{label}</p>
      <p className={`mt-2 text-lg font-semibold leading-tight tabular-nums ${valueClassName}`}>{value}</p>
      {sublabel ? (
        <p className={`mt-1 truncate text-xs ${sublabel.className ?? 'text-text-secondary'}`}>{sublabel.text}</p>
      ) : null}
    </div>
  )
}

export default QuickStatCard
