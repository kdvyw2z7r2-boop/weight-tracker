import { useMemo } from 'react'
import EntryCard from '../components/EntryCard'

function LogScreen({ entries, deleteEntry, onAdd }) {
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Historique</h2>
        <button type="button" onClick={onAdd} className="rounded-xl bg-white px-3 py-2 text-black">
          Ajouter
        </button>
      </div>
      {Object.entries(grouped).map(([month, monthEntries]) => (
        <div key={month} className="space-y-2">
          <h3 className="text-sm uppercase tracking-wide text-text-secondary">{month}</h3>
          {monthEntries.map((entry, index) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              previous={monthEntries[index + 1]}
              onDelete={deleteEntry}
            />
          ))}
        </div>
      ))}
    </section>
  )
}

export default LogScreen
