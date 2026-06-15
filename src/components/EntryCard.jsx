import { useState } from 'react'
import { formatDateEntry } from '../utils/locale'

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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const delta = previous ? entry.weight - previous.weight : null
  const deltaBadgeClass =
    delta === null
      ? 'bg-bg-elevated text-text-tertiary'
      : delta <= 0
        ? 'bg-accent-green/15 text-accent-green'
        : 'bg-accent-red/15 text-accent-red'

  return (
    <article
      className="press-card animate-fade-up relative rounded-2xl border border-border bg-bg-card px-5 py-4"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPhotoPress?.(entry)}
          className={`press-button rounded-lg p-1.5 transition duration-150 ${
            hasPhoto ? 'text-white hover:bg-bg-elevated' : 'text-text-tertiary hover:text-text-secondary'
          }`}
          aria-label={hasPhoto ? 'Voir la photo' : 'Ajouter une photo'}
        >
          <CameraIcon active={hasPhoto} />
        </button>
        <button
          type="button"
          onClick={() => setIsConfirmingDelete(true)}
          className="press-button rounded-lg p-1.5 text-text-tertiary transition duration-150 hover:text-text-secondary"
          aria-label="Supprimer l'entrée"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="1.75">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M7 6l1 14h8l1-14" />
            <path d="M10 10v6M14 10v6" />
          </svg>
        </button>
      </div>

      <div className="flex items-end justify-between pr-16">
        <div>
          <p className="text-[13px] text-text-tertiary">{formatDateEntry(entry.date)}</p>
          <p className="mt-1 text-[22px] font-semibold leading-tight tabular-nums text-white">
            {entry.weight.toString().replace('.', ',')} {unit}
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${deltaBadgeClass}`}>
            {delta === null
              ? '—'
              : `${delta > 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')} ${unit}`}
          </span>
        </div>
      </div>

      {entry.note ? <p className="mt-3 text-[13px] italic text-text-tertiary">{entry.note}</p> : null}

      {isConfirmingDelete ? (
        <div className="mt-4 animate-scale-in flex items-center justify-between rounded-xl bg-bg-elevated p-3 text-sm">
          <p className="text-text-secondary">Confirmer la suppression ?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onDelete(entry.id)
                setIsConfirmingDelete(false)
              }}
              className="press-button rounded-lg bg-accent-red px-3 py-1.5 font-medium text-white"
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="press-button rounded-lg px-3 py-1.5 text-text-secondary"
            >
              Non
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

export default EntryCard
