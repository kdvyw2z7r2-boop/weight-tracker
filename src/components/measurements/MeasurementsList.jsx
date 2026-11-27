import { MEASUREMENT_ZONES, formatCmValue } from '../../utils/measurements'
import { formatDateEntry } from '../../utils/locale'

/** Relevés du plus récent au plus ancien, avec Modifier / Supprimer (annulable). */
function MeasurementsList({ measurements, onEdit, onDelete }) {
  const items = [...measurements].reverse()
  if (!items.length) return null
  return (
    <ul className="divide-y divide-white/10" aria-label="Relevés de mensurations">
      {items.map((record) => {
        const parts = MEASUREMENT_ZONES.filter(({ key }) => record[key] != null).map(
          ({ key, label }) => `${label} ${formatCmValue(record[key])}`,
        )
        return (
          <li key={record.id} className="flex items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-text-primary">{formatDateEntry(record.date)}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-text-secondary tabular-nums">{parts.join(' · ')} cm</p>
            </div>
            <button
              type="button"
              onClick={() => onEdit(record)}
              className="press-button min-h-11 shrink-0 rounded-full px-3 text-[13px] font-semibold text-accent-text"
              aria-label={`Modifier le relevé du ${formatDateEntry(record.date)}`}
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={() => onDelete(record)}
              className="press-button min-h-11 shrink-0 rounded-full px-3 text-[13px] font-semibold text-danger-text"
              aria-label={`Supprimer le relevé du ${formatDateEntry(record.date)}`}
            >
              Supprimer
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default MeasurementsList
