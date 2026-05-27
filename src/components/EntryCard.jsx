import { useState } from 'react'

function EntryCard({ entry, previous, onDelete }) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const delta = previous ? (entry.weight - previous.weight).toFixed(2) : null
  const deltaClass =
    delta === null ? 'text-text-secondary' : Number(delta) <= 0 ? 'text-green-400' : 'text-red-400'
  return (
    <article className="rounded-2xl bg-bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">{entry.date}</p>
          <p className="text-xl font-semibold">{entry.weight} kg</p>
        </div>
        <div className="flex items-center gap-3">
          <p className={`text-sm ${deltaClass}`}>{delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta} kg`}</p>
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="rounded-lg border border-border p-2 text-text-secondary transition hover:text-white"
            aria-label="Supprimer l'entree"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M7 6l1 14h8l1-14" />
              <path d="M10 10v6M14 10v6" />
            </svg>
          </button>
        </div>
      </div>
      {entry.note ? <p className="mt-2 text-sm text-text-secondary">{entry.note}</p> : null}
      {isConfirmingDelete ? (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-border p-3 text-sm">
          <p className="text-text-secondary">Confirmer la suppression ?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onDelete(entry.id)
                setIsConfirmingDelete(false)
              }}
              className="rounded-md bg-red-500 px-2 py-1 font-medium text-white"
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="rounded-md border border-border px-2 py-1"
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
