import { useMemo } from 'react'
import { formatDateEntry } from '../utils/locale'
import { buildComparePairs } from '../utils/progressPhotos'

function CompareSlot({ label, date, url, weight, unit }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-text-tertiary">{label}</p>
      <div className="aspect-[9/16] overflow-hidden rounded-xl border border-border bg-bg-elevated">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-[12px] text-text-tertiary">
            Pas encore de photo
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[12px] text-text-tertiary">{date ? formatDateEntry(date) : '—'}</p>
      {weight != null ? (
        <p className="text-center text-[13px] font-medium tabular-nums text-white">
          {weight.toString().replace('.', ',')} {unit}
        </p>
      ) : null}
    </div>
  )
}

function ProgressCompare({ photosByDate, entries, unit = 'kg' }) {
  const pairs = useMemo(() => buildComparePairs(photosByDate, entries), [photosByDate, entries])

  if (!pairs.length || !pairs[0]?.before?.url) {
    return null
  }

  return (
    <div className="card-base animate-fade-up animate-stagger-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-text-primary">Évolution photo</p>
        <p className="mt-0.5 text-[12px] text-text-tertiary">Comparaisons privées depuis votre première photo</p>
      </div>

      {pairs.map((pair) => (
        <div key={pair.key} className="rounded-2xl border border-border bg-bg-elevated/40 p-3">
          <p className="mb-3 text-center text-[13px] font-medium text-text-secondary">{pair.label}</p>
          <div className="flex gap-3">
            <CompareSlot
              label="Départ"
              date={pair.before.date}
              url={pair.before.url}
              weight={pair.before.weight}
              unit={unit}
            />
            <CompareSlot
              label={pair.after ? 'Actuel' : `Objectif ${pair.targetDate.slice(8, 10)}/${pair.targetDate.slice(5, 7)}`}
              date={pair.after?.date}
              url={pair.after?.url}
              weight={pair.after?.weight}
              unit={unit}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default ProgressCompare
