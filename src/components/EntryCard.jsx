import GlassCard from './ui/GlassCard'
import { formatDateEntry } from '../utils/locale'
import { formatWeight, formatWeightWithUnit } from '../utils/format'

function CameraIcon({ active = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 fill-none ${active ? 'text-accent' : 'text-text-secondary'}`}
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
      ? 'badge-tone badge-tone-neutral'
      : delta <= 0
        ? 'badge-tone badge-tone-good'
        : 'badge-tone badge-tone-bad'

  return (
    <GlassCard
      as="article"
      className="press-card animate-fade-up px-5 py-4"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPhotoPress?.(entry)}
          className="press-button glass-icon-btn focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          aria-label={`${hasPhoto ? 'Voir la photo du' : 'Ajouter une photo du'} ${dateLabel}`}
        >
          <CameraIcon active={hasPhoto} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="press-button glass-icon-btn focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
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

      <div className="flex items-end justify-between pr-28">
        <div>
          <p className="text-[13px] font-medium capitalize text-text-secondary">{dateLabel}</p>
          <p className="mt-1 whitespace-nowrap text-[28px] font-light leading-tight tracking-[-0.03em] tabular-nums text-text-primary">
            {formatWeight(entry.weight)}{"\u00A0"}<span className="text-[15px] font-medium tracking-normal text-text-secondary">{unit}</span>
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

      {entry.note ? <p className="mt-3 text-[14px] text-text-secondary">{entry.note}</p> : null}
    </GlassCard>
  )
}

export default EntryCard
