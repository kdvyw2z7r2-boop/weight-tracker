import { useState } from 'react'
import { formatDateEntry } from '../utils/locale'
import { getBmi } from '../utils/stats'

function EntryCard({ entry, previous, onDelete, unit = 'kg', height = 0, index = 0 }) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const delta = previous ? entry.weight - previous.weight : null
  const bmi = getBmi(entry.weight, height)
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
      <button
        type="button"
        onClick={() => setIsConfirmingDelete(true)}
        className="press-button absolute right-4 top-4 text-text-tertiary transition duration-150 hover:text-text-secondary"
        aria-label="Supprimer l'entrée"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="1.75">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M7 6l1 14h8l1-14" />
          <path d="M10 10v6M14 10v6" />
        </svg>
      </button>

      <div className="flex items-end justify-between pr-8">
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
          <p className="mt-1.5 text-[13px] text-text-tertiary">
            IMC {bmi ? bmi.toFixed(1).replace('.', ',') : '—'}
          </p>
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
