import { formatDateEntry } from '../utils/locale'
import { formatWeight, formatWeightWithUnit } from '../utils/format'

function CameraIcon({ active = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 fill-none ${active ? 'text-white' : 'text-text-tertiary'}`}
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path
        d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function EntryCard({
  entry,
  previous,
  onDelete,
  onPhotoPress,
  hasPhoto = false,
  unit = 'kg',
  index = 0,
}) {
  const dateLabel = formatDateEntry(entry.date)
  const delta = previous ? entry.weight - previous.weight : null
  const deltaBadgeClass =
    delta === null
      ? 'badge-neon badge-neon-neutral'
      : delta <= 0
        ? 'badge-neon badge-neon-green'
        : 'badge-neon badge-neon-red'

  return (
    <article
      className="press-card animate-fade-up relative rounded-2xl border border-border bg-bg-card px-5 py-4"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute right-1 top-1 flex items-center">
        <button
          type="button"
          onClick={() => onPhotoPress?.(entry)}
          className={`press-button flex h-11 w-11 items-center justify-center rounded-lg transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-blue ${
            hasPhoto ? 'text-white hover:bg-bg-elevated' : 'text-text-tertiary hover:text-text-secondary'
          }`}
          aria-label={`${hasPhoto ? 'Voir la photo du' : 'Ajouter une photo du'} ${dateLabel}`}
        >
          <CameraIcon active={hasPhoto} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="press-button flex h-11 w-11 items-center justify-center rounded-lg text-text-tertiary transition duration-150 hover:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-blue"
          aria-label={`Supprimer la pesée du ${dateLabel}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="1.75">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M7 6l1 14h8l1-14" />
            <path d="M10 10v6M14 10v6" />
          </svg>
        </button>
      </div>

      <div className="flex items-end justify-between pr-24">
        <div>
          <p className="text-[12px] font-medium tracking-wide uppercase text-text-tertiary">{dateLabel}</p>
          <p className="mt-1 whitespace-nowrap text-[24px] font-black leading-tight tabular-nums text-white" style={{ letterSpacing: '-1px' }}>
            {formatWeight(entry.weight)}{"\u00A0"}<span className="text-[14px] font-bold text-text-tertiary">{unit}</span>
          </p>
        </div>
        <div className="text-right">
          <span className={deltaBadgeClass}>
            {delta === null
              ? '—'
              : `${delta > 0 ? '+' : ''}${formatWeightWithUnit(delta, unit)}`}
          </span>
        </div>
      </div>

      {entry.note ? <p className="mt-3 text-[13px] italic text-text-tertiary">{entry.note}</p> : null}
    </article>
  )
}

export default EntryCard
