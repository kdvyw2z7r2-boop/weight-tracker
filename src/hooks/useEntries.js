import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const SUPABASE_TABLE = 'weight_histories'
const LEGACY_ENTRIES_KEY = 'wt_entries'
const USER_ENTRIES_PREFIX = 'wt_entries:'

const kgToLbs = (kg) => kg * 2.20462
const lbsToKg = (lbs) => lbs / 2.20462
const round = (value) => Math.round(value * 100) / 100

const sortByDateDesc = (items) =>
  [...items].sort((a, b) => (a.date < b.date ? 1 : -1))

const localFallbackMessage =
  "Mode local activé : Supabase n'est pas encore disponible pour synchroniser le cloud."

function normalizeEntries(items) {
  if (!Array.isArray(items)) return []

  return sortByDateDesc(
    items
      .filter((entry) => entry && entry.id && entry.date && Number.isFinite(Number(entry.weight)))
      .map((entry) => ({
        ...entry,
        weight: Number(entry.weight),
        note: entry.note ?? '',
        createdAt: entry.createdAt ?? Date.now(),
      })),
  )
}

function getLocalEntriesKey(userId) {
  return `${USER_ENTRIES_PREFIX}${userId}`
}

function readEntriesFromStorage(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? normalizeEntries(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

function writeEntriesToStorage(key, entries) {
  try {
    window.localStorage.setItem(key, JSON.stringify(normalizeEntries(entries)))
  } catch {
    // Local fallback is best-effort only.
  }
}

function removeEntriesFromStorage(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Local fallback is best-effort only.
  }
}

function readLocalFallbackEntries(userId) {
  const userEntries = readEntriesFromStorage(getLocalEntriesKey(userId))
  if (userEntries.length > 0) return userEntries
  return readEntriesFromStorage(LEGACY_ENTRIES_KEY)
}

function storeLocalFallbackEntries(userId, entries) {
  writeEntriesToStorage(getLocalEntriesKey(userId), entries)
}

function clearLegacyEntries() {
  removeEntriesFromStorage(LEGACY_ENTRIES_KEY)
}

async function fetchWeights(userId) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select('weights')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return normalizeEntries(data?.weights ?? [])
}

async function saveWeights(userId, weights) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase.from(SUPABASE_TABLE).upsert(
    {
      user_id: userId,
      weights: normalizeEntries(weights),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw error
}

function createEntry(entry) {
  return {
    id: crypto.randomUUID(),
    date: entry.date ?? format(new Date(), 'yyyy-MM-dd'),
    weight: Number(entry.weight),
    note: entry.note?.trim() ?? '',
    createdAt: Date.now(),
  }
}

function useEntries(unit = 'kg', userId) {
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [storageMode, setStorageMode] = useState(isSupabaseConfigured ? 'cloud' : 'local')
  const [error, setError] = useState('')

  const loadEntries = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setHasLoaded(false)
    setError('')

    const localEntries = readLocalFallbackEntries(userId)

    try {
      const cloudEntries = await fetchWeights(userId)
      const nextEntries = cloudEntries.length > 0 ? cloudEntries : localEntries

      if (cloudEntries.length === 0 && localEntries.length > 0) {
        await saveWeights(userId, localEntries)
        clearLegacyEntries()
      }

      storeLocalFallbackEntries(userId, nextEntries)
      setEntries(normalizeEntries(nextEntries))
      setStorageMode('cloud')
      setHasLoaded(true)
    } catch {
      setEntries(normalizeEntries(localEntries))
      setStorageMode('local')
      setError(localFallbackMessage)
      setHasLoaded(true)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadEntries()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadEntries])

  const persist = useCallback(
    async (nextEntries) => {
      if (!userId) {
        setStorageMode('local')
        setError(localFallbackMessage)
        return normalizeEntries(nextEntries)
      }

      const sortedNextEntries = normalizeEntries(nextEntries)
      setEntries(sortedNextEntries)
      storeLocalFallbackEntries(userId, sortedNextEntries)
      setIsSaving(true)
      setError('')

      try {
        await saveWeights(userId, sortedNextEntries)
        clearLegacyEntries()
        setStorageMode('cloud')
      } catch {
        setStorageMode('local')
        setError(localFallbackMessage)
      } finally {
        setIsSaving(false)
      }

      return sortedNextEntries
    },
    [userId],
  )

  const addEntry = useCallback(async (entry) => {
    return persist([...entries, createEntry(entry)])
  }, [entries, persist])

  const updateEntry = useCallback(async (id, data) => {
    const next = entries.map((entry) =>
      entry.id === id ? { ...entry, ...data, weight: Number(data.weight ?? entry.weight) } : entry,
    )
    return persist(next)
  }, [entries, persist])

  const deleteEntry = useCallback(async (id) => {
    const next = entries.filter((entry) => entry.id !== id)
    return persist(next)
  }, [entries, persist])

  const getMovingAverage = useCallback((windowSize = 7) => {
    const asc = [...entries].reverse()
    return asc.map((entry, i) => {
      const window = asc.slice(Math.max(0, i - windowSize + 1), i + 1)
      const avg = window.reduce((sum, item) => sum + item.weight, 0) / window.length
      return { date: entry.date, avg: round(avg) }
    })
  }, [entries])

  const exportCSV = useCallback(() => {
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
  }, [entries])

  const exportJSON = useCallback((settings) => {
    const payload = { entries, settings, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `weight-tracker-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [entries])

  const importJSON = useCallback(async (file) => {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed.entries)) {
      throw new Error('Invalid backup format')
    }
    await persist(parsed.entries)
    return parsed
  }, [persist])

  const convertAllUnits = useCallback(async (nextUnit) => {
    if (nextUnit === unit) return
    const next = entries.map((entry) => ({
      ...entry,
      weight: round(nextUnit === 'lbs' ? kgToLbs(entry.weight) : lbsToKg(entry.weight)),
    }))
    await persist(next)
  }, [entries, persist, unit])

  const clearEntries = useCallback(async () => {
    await persist([])
  }, [persist])

  return useMemo(() => ({
    entries,
    userId,
    isLoading,
    hasLoaded,
    isSaving,
    storageMode,
    error,
    reload: loadEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    getMovingAverage,
    exportCSV,
    exportJSON,
    importJSON,
    convertAllUnits,
    clearEntries,
  }), [
    entries,
    userId,
    isLoading,
    hasLoaded,
    isSaving,
    storageMode,
    error,
    loadEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    getMovingAverage,
    exportCSV,
    exportJSON,
    importJSON,
    convertAllUnits,
    clearEntries,
  ])
}

export default useEntries
