import { useMemo } from 'react'
import EntryCard from '../components/EntryCard'
import usePendingDelete from '../hooks/usePendingDelete'
import { useToast } from '../hooks/useToast'
import { formatMonthYear } from '../utils/locale'

const UNDO_DELAY_MS = 5000

function LogScreen({ entries, deleteEntries, onAdd, onPhotoPress, hasPhotoForDate, unit }) {
  const { show, dismiss } = useToast()
  const { pendingIds, schedule, undo } = usePendingDelete(deleteEntries, UNDO_DELAY_MS, dismiss)

  const handleDelete = (id) => {
    schedule(id)
    show('Pesée supprimée', {
      duration: UNDO_DELAY_MS,
      action: { label: 'Annuler', onClick: () => undo(id) },
    })
  }

  const visibleEntries = useMemo(
    () => entries.filter((entry) => !pendingIds.has(entry.id)),
    [entries, pendingIds],
  )

  const grouped = useMemo(() => {
    return visibleEntries.reduce((acc, entry) => {
      const month = entry.date.slice(0, 7)
      if (!acc[month]) acc[month] = []
      acc[month].push(entry)
      return acc
    }, {})
  }, [visibleEntries])

  return (
    <section className="space-y-4">
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-black uppercase tracking-tight neon-text-cyan">Journal</h2>
          <p className="mt-0.5 text-[13px] text-text-tertiary">
            {visibleEntries.length} entrée{visibleEntries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" onClick={onAdd} className="btn-primary h-10 px-5 text-[13px] font-bold tracking-wide">
          + Ajouter
        </button>
      </div>

      {!visibleEntries.length ? (
        <div className="card-base animate-fade-up animate-stagger-1 flex flex-col items-center py-12 text-center">
          <div className="empty-state-icon animate-float mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">
            📋
          </div>
          <p className="font-medium text-text-primary">Aucune entrée</p>
          <p className="mt-2 text-[14px] text-text-tertiary">Vos pesées apparaîtront ici.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([month, monthEntries], groupIndex) => (
          <div key={month} className="space-y-3">
            <h3 className="section-label animate-fade-up" style={{ animationDelay: `${groupIndex * 80}ms` }}>
              {formatMonthYear(month)}
            </h3>
            {monthEntries.map((entry, index) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                previous={monthEntries[index + 1]}
                onDelete={handleDelete}
                onPhotoPress={onPhotoPress}
                hasPhoto={hasPhotoForDate?.(entry.date)}
                unit={unit}
                index={index}
              />
            ))}
          </div>
        ))
      )}
    </section>
  )
}

export default LogScreen
