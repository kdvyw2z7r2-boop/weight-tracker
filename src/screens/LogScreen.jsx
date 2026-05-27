import { useMemo } from 'react'
import EntryCard from '../components/EntryCard'
import { formatMonthYear } from '../utils/locale'

function LogScreen({ entries, deleteEntry, onAdd, unit, height }) {
  const grouped = useMemo(() => {
    return entries.reduce((acc, entry) => {
      const month = entry.date.slice(0, 7)
      if (!acc[month]) acc[month] = []
      acc[month].push(entry)
      return acc
    }, {})
  }, [entries])

  return (
    <section className="space-y-4">
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-semibold">Historique</h2>
          <p className="mt-0.5 text-[13px] text-text-tertiary">
            {entries.length} entrée{entries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" onClick={onAdd} className="btn-primary h-11 px-5 text-[15px]">
          Ajouter
        </button>
      </div>

      {!entries.length ? (
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
                onDelete={deleteEntry}
                unit={unit}
                height={height}
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
