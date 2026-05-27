import { useState } from 'react'
import { format } from 'date-fns'

const ENTRIES_KEY = 'wt_entries'

const kgToLbs = (kg) => kg * 2.20462
const lbsToKg = (lbs) => lbs / 2.20462
const round = (value) => Math.round(value * 100) / 100

const sortByDateDesc = (items) =>
  [...items].sort((a, b) => (a.date < b.date ? 1 : -1))

function useEntries(unit = 'kg') {
  const [entries, setEntries] = useState(() => {
    const raw = localStorage.getItem(ENTRIES_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return sortByDateDesc(parsed)
    } catch {
      return []
    }
  })

  const persist = (nextEntries) => {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(nextEntries))
    setEntries(sortByDateDesc(nextEntries))
  }

  const addEntry = (entry) => {
    const next = [
      ...entries,
      {
        id: crypto.randomUUID(),
        date: entry.date ?? format(new Date(), 'yyyy-MM-dd'),
        weight: Number(entry.weight),
        note: entry.note?.trim() ?? '',
        createdAt: Date.now(),
      },
    ]
    persist(next)
    return next
  }

  const updateEntry = (id, data) => {
    const next = entries.map((entry) =>
      entry.id === id ? { ...entry, ...data, weight: Number(data.weight ?? entry.weight) } : entry,
    )
    persist(next)
    return next
  }

  const deleteEntry = (id) => {
    const next = entries.filter((entry) => entry.id !== id)
    persist(next)
    return next
  }

  const getMovingAverage = (windowSize = 7) => {
    const asc = [...entries].reverse()
    return asc.map((entry, i) => {
      const window = asc.slice(Math.max(0, i - windowSize + 1), i + 1)
      const avg = window.reduce((sum, item) => sum + item.weight, 0) / window.length
      return { date: entry.date, avg: round(avg) }
    })
  }

  const exportCSV = () => {
    const lines = ['date,weight,note,createdAt']
    entries.forEach((entry) => {
      lines.push(`${entry.date},${entry.weight},"${entry.note ?? ''}",${entry.createdAt}`)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `weight-tracker-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportJSON = (settings) => {
    const payload = { entries, settings, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `weight-tracker-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJSON = async (file) => {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed.entries)) {
      throw new Error('Invalid backup format')
    }
    persist(parsed.entries)
    return parsed
  }

  const convertAllUnits = (nextUnit) => {
    if (nextUnit === unit) return
    const next = entries.map((entry) => ({
      ...entry,
      weight: round(nextUnit === 'lbs' ? kgToLbs(entry.weight) : lbsToKg(entry.weight)),
    }))
    persist(next)
  }

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    getMovingAverage,
    exportCSV,
    exportJSON,
    importJSON,
    convertAllUnits,
  }
}

export default useEntries
