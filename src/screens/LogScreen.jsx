import { useMemo } from 'react'
import GlassButton from '../components/ui/GlassButton'
import GlassCard from '../components/ui/GlassCard'
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
          <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-text-primary">Journal</h2>
          <p className="mt-0.5 text-[13px] font-medium text-text-secondary">
            {visibleEntries.length} entrée{visibleEntries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <GlassButton onClick={onAdd}>+ Ajouter</GlassButton>
      </div>

      {!visibleEntries.length ? (
        <GlassCard className="animate-fade-up animate-stagger-1 flex flex-col items-center px-5 py-12 text-center">
          <div className="glass-sm mb-4 flex h-14 w-14 items-center justify-center text-2xl" aria-hidden="true">
            📋
          </div>
          <p className="text-[17px] font-semibold text-text-primary">Aucune entrée</p>
          <p className="mt-2 text-[14px] text-text-secondary">Vos pesées apparaîtront ici.</p>
        </GlassCard>
      ) : (
        Object.entries(grouped).map(([month, monthEntries], groupIndex) => (
          <div key={month} className="space-y-2">
            <h3 className="section-label animate-fade-up px-2 pt-1 capitalize" style={{ animationDelay: `${groupIndex * 80}ms` }}>
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
