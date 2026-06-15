import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { createSupabaseClient, isSupabaseConfigured, PHOTO_BUCKET } from '../lib/supabase'
import { createSignedPhotoUrl, photoStoragePath } from '../utils/photo'

const API_ENDPOINT = '/api/sync'
const LEGACY_ENTRIES_KEY = 'wt_entries'
const LEGACY_SETTINGS_KEY = 'wt_settings'
const USER_ENTRIES_PREFIX = 'wt_entries:'
const USER_SETTINGS_PREFIX = 'wt_settings:'
const USER_PHOTOS_PREFIX = 'wt_photos:'

export const defaultSettings = {
  targetWeight: 70,
  height: 178,
  unit: 'kg',
  reminderEnabled: false,
  reminderTime: '08:00',
  theme: 'dark',
  weeklyPace: null,
  planSetupComplete: false,
  planStartDate: null,
  planStartWeight: null,
}

const kgToLbs = (kg) => kg * 2.20462
const lbsToKg = (lbs) => lbs / 2.20462
const round = (value) => Math.round(value * 100) / 100

const sortByDateDesc = (items) =>
  [...items].sort((a, b) => (a.date < b.date ? 1 : -1))

const localFallbackMessage =
  'Mode local : impossible de joindre le cloud pour le moment. Vos données restent sur cet appareil.'

const photoUnavailableMessage =
  'Les photos nécessitent Supabase. Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'

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

function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...defaultSettings }
  return { ...defaultSettings, ...raw }
}

function normalizePhotosMap(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return Object.fromEntries(
    Object.entries(raw).filter(([date, photo]) => date && photo?.storagePath),
  )
}

function mergeEntries(cloudEntries, localEntries) {
  const byId = new Map()

  for (const entry of [...cloudEntries, ...localEntries]) {
    const existing = byId.get(entry.id)
    if (!existing || (entry.createdAt ?? 0) >= (existing.createdAt ?? 0)) {
      byId.set(entry.id, entry)
    }
  }

  return sortByDateDesc([...byId.values()])
}

function mergeSettings(localSettings, cloudSettings) {
  const local = normalizeSettings(localSettings)
  const cloud = cloudSettings ? normalizeSettings(cloudSettings) : null
  if (!cloud) return local
  return { ...local, ...cloud }
}

function readFromStorage(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Best-effort local cache.
  }
}

function removeFromStorage(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Best-effort.
  }
}

function getLocalEntriesKey(userId) {
  return `${USER_ENTRIES_PREFIX}${userId}`
}

function getLocalSettingsKey(userId) {
  return `${USER_SETTINGS_PREFIX}${userId}`
}

function getLocalPhotosKey(userId) {
  return `${USER_PHOTOS_PREFIX}${userId}`
}

function readLocalEntries(userId) {
  const userEntries = readFromStorage(getLocalEntriesKey(userId))
  if (Array.isArray(userEntries) && userEntries.length > 0) {
    return normalizeEntries(userEntries)
  }
  const legacy = readFromStorage(LEGACY_ENTRIES_KEY)
  return Array.isArray(legacy) ? normalizeEntries(legacy) : []
}

function readLocalSettings(userId) {
  const userSettings = readFromStorage(getLocalSettingsKey(userId))
  if (userSettings) return normalizeSettings(userSettings)
  return normalizeSettings(readFromStorage(LEGACY_SETTINGS_KEY))
}

function readLocalPhotos(userId) {
  return normalizePhotosMap(readFromStorage(getLocalPhotosKey(userId)))
}

function storeLocalEntries(userId, entries) {
  writeToStorage(getLocalEntriesKey(userId), normalizeEntries(entries))
}

function storeLocalSettings(userId, settings) {
  writeToStorage(getLocalSettingsKey(userId), normalizeSettings(settings))
}

function storeLocalPhotos(userId, photosByDate) {
  writeToStorage(getLocalPhotosKey(userId), normalizePhotosMap(photosByDate))
}

function clearLegacyStorage() {
  removeFromStorage(LEGACY_ENTRIES_KEY)
  removeFromStorage(LEGACY_SETTINGS_KEY)
}

async function fetchCloudData(userId) {
  const response = await fetch(`${API_ENDPOINT}?userId=${encodeURIComponent(userId)}`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error('Unable to load cloud data')
  }

  const data = await response.json()
  return {
    entries: normalizeEntries(data.entries),
    settings: data.settings ? normalizeSettings(data.settings) : null,
  }
}

async function saveCloudData(userId, entries, settings) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, entries: normalizeEntries(entries), settings: normalizeSettings(settings) }),
  })

  if (!response.ok) {
    throw new Error('Unable to save cloud data')
  }
}

function rowToEntry(row) {
  return {
    id: row.id,
    date: row.date,
    weight: Number(row.weight),
    note: row.note ?? '',
    createdAt: Number(row.created_at),
  }
}

async function fetchSupabaseData(db, userId) {
  const [entriesResult, settingsResult, photosResult] = await Promise.all([
    db.from('entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
    db.from('user_settings').select('settings').eq('user_id', userId).maybeSingle(),
    db.from('daily_photos').select('date, storage_path').eq('user_id', userId),
  ])

  if (entriesResult.error) throw entriesResult.error
  if (settingsResult.error) throw settingsResult.error
  if (photosResult.error) throw photosResult.error

  const entries = normalizeEntries((entriesResult.data ?? []).map(rowToEntry))
  const settings = settingsResult.data?.settings ? normalizeSettings(settingsResult.data.settings) : null
  const photosByDate = {}

  for (const row of photosResult.data ?? []) {
    photosByDate[row.date] = { storagePath: row.storage_path, url: null }
  }

  await hydratePhotoUrls(db, photosByDate)

  return { entries, settings, photosByDate }
}

async function hydratePhotoUrls(db, photosByDate) {
  if (!db) return

  await Promise.all(
    Object.values(photosByDate).map(async (photo) => {
      if (!photo.storagePath) return
      try {
        photo.url = await createSignedPhotoUrl(db, photo.storagePath)
      } catch {
        photo.url = null
      }
    }),
  )
}

async function saveSupabaseData(db, userId, entries, settings) {
  const normalizedEntries = normalizeEntries(entries)
  const normalizedSettings = normalizeSettings(settings)

  const { data: existingRows, error: existingError } = await db
    .from('entries')
    .select('id')
    .eq('user_id', userId)

  if (existingError) throw existingError

  const existingIds = new Set((existingRows ?? []).map((row) => row.id))
  const nextIds = new Set(normalizedEntries.map((entry) => entry.id))
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id))

  if (idsToDelete.length) {
    const { error } = await db.from('entries').delete().in('id', idsToDelete)
    if (error) throw error
  }

  if (normalizedEntries.length) {
    const rows = normalizedEntries.map((entry) => ({
      id: entry.id,
      user_id: userId,
      date: entry.date,
      weight: entry.weight,
      note: entry.note ?? '',
      created_at: entry.createdAt ?? Date.now(),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await db.from('entries').upsert(rows)
    if (error) throw error
  } else {
    const { error } = await db.from('entries').delete().eq('user_id', userId)
    if (error) throw error
  }

  const { error: settingsError } = await db.from('user_settings').upsert({
    user_id: userId,
    settings: normalizedSettings,
    updated_at: new Date().toISOString(),
  })

  if (settingsError) throw settingsError
}

async function uploadPhotoToSupabase(db, userId, date, blob) {
  const storagePath = photoStoragePath(userId, date)

  const { error: uploadError } = await db.storage.from(PHOTO_BUCKET).upload(storagePath, blob, {
    upsert: true,
    contentType: 'image/webp',
    cacheControl: '3600',
  })

  if (uploadError) throw uploadError

  const { error: metaError } = await db.from('daily_photos').upsert({
    user_id: userId,
    date,
    storage_path: storagePath,
    updated_at: new Date().toISOString(),
  })

  if (metaError) throw metaError

  const url = await createSignedPhotoUrl(db, storagePath)
  return { storagePath, url }
}

async function deletePhotoFromSupabase(db, userId, date, storagePath) {
  if (storagePath) {
    const { error: storageError } = await db.storage.from(PHOTO_BUCKET).remove([storagePath])
    if (storageError) throw storageError
  }

  const { error } = await db.from('daily_photos').delete().eq('user_id', userId).eq('date', date)
  if (error) throw error
}

async function deleteAllPhotosFromSupabase(db, userId, photosByDate) {
  const paths = Object.values(photosByDate)
    .map((photo) => photo.storagePath)
    .filter(Boolean)

  if (paths.length) {
    const { error: storageError } = await db.storage.from(PHOTO_BUCKET).remove(paths)
    if (storageError) throw storageError
  }

  const { error } = await db.from('daily_photos').delete().eq('user_id', userId)
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

function useSync(userId) {
  const [entries, setEntries] = useState([])
  const [settings, setSettings] = useState(defaultSettings)
  const [photosByDate, setPhotosByDate] = useState({})
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [storageMode, setStorageMode] = useState(isSupabaseConfigured ? 'supabase' : 'cloud')
  const [error, setError] = useState('')

  const db = useMemo(() => createSupabaseClient(userId), [userId])

  const loadData = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setHasLoaded(false)
    setError('')

    const localEntries = readLocalEntries(userId)
    const localSettings = readLocalSettings(userId)
    const localPhotos = readLocalPhotos(userId)

    try {
      if (db) {
        const cloud = await fetchSupabaseData(db, userId)
        const mergedEntries = mergeEntries(cloud.entries, localEntries)
        const mergedSettings = mergeSettings(localSettings, cloud.settings)
        const mergedPhotos =
          Object.keys(cloud.photosByDate).length > 0 ? cloud.photosByDate : localPhotos

        storeLocalEntries(userId, mergedEntries)
        storeLocalSettings(userId, mergedSettings)
        storeLocalPhotos(userId, mergedPhotos)
        clearLegacyStorage()

        const cloudWasEmpty =
          cloud.entries.length === 0 && !cloud.settings && Object.keys(cloud.photosByDate).length === 0
        const hasLocalData =
          localEntries.length > 0 ||
          JSON.stringify(localSettings) !== JSON.stringify(defaultSettings) ||
          Object.keys(localPhotos).length > 0

        if (cloudWasEmpty && hasLocalData) {
          await saveSupabaseData(db, userId, mergedEntries, mergedSettings)
        } else if (
          mergedEntries.length !== cloud.entries.length ||
          JSON.stringify(mergedSettings) !== JSON.stringify(cloud.settings ?? defaultSettings)
        ) {
          await saveSupabaseData(db, userId, mergedEntries, mergedSettings)
        }

        setEntries(mergedEntries)
        setSettings(mergedSettings)
        setPhotosByDate(mergedPhotos)
        setStorageMode('supabase')
        setHasLoaded(true)
        return
      }

      const cloud = await fetchCloudData(userId)
      const mergedEntries = mergeEntries(cloud.entries, localEntries)
      const mergedSettings = mergeSettings(localSettings, cloud.settings)

      storeLocalEntries(userId, mergedEntries)
      storeLocalSettings(userId, mergedSettings)
      clearLegacyStorage()

      const cloudWasEmpty = cloud.entries.length === 0 && !cloud.settings
      const hasLocalData =
        localEntries.length > 0 || JSON.stringify(localSettings) !== JSON.stringify(defaultSettings)

      if (cloudWasEmpty && hasLocalData) {
        await saveCloudData(userId, mergedEntries, mergedSettings)
      } else if (
        mergedEntries.length !== cloud.entries.length ||
        JSON.stringify(mergedSettings) !== JSON.stringify(cloud.settings ?? defaultSettings)
      ) {
        await saveCloudData(userId, mergedEntries, mergedSettings)
      }

      setEntries(mergedEntries)
      setSettings(mergedSettings)
      setPhotosByDate(localPhotos)
      setStorageMode('cloud')
      setHasLoaded(true)
    } catch {
      storeLocalEntries(userId, localEntries)
      storeLocalSettings(userId, localSettings)
      storeLocalPhotos(userId, localPhotos)
      setEntries(localEntries)
      setSettings(localSettings)
      setPhotosByDate(localPhotos)
      setStorageMode('local')
      setError(localFallbackMessage)
      setHasLoaded(true)
    } finally {
      setIsLoading(false)
    }
  }, [userId, db])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  const persist = useCallback(
    async (nextEntries, nextSettings, nextPhotos = photosByDate) => {
      if (!userId) {
        setStorageMode('local')
        setError(localFallbackMessage)
        return
      }

      const sortedEntries = normalizeEntries(nextEntries)
      const normalizedSettings = normalizeSettings(nextSettings)
      const normalizedPhotos = normalizePhotosMap(nextPhotos)

      setEntries(sortedEntries)
      setSettings(normalizedSettings)
      setPhotosByDate(normalizedPhotos)
      storeLocalEntries(userId, sortedEntries)
      storeLocalSettings(userId, normalizedSettings)
      storeLocalPhotos(userId, normalizedPhotos)
      setIsSaving(true)
      setError('')

      try {
        if (db) {
          await saveSupabaseData(db, userId, sortedEntries, normalizedSettings)
          clearLegacyStorage()
          setStorageMode('supabase')
        } else {
          await saveCloudData(userId, sortedEntries, normalizedSettings)
          clearLegacyStorage()
          setStorageMode('cloud')
        }
      } catch {
        setStorageMode('local')
        setError(localFallbackMessage)
      } finally {
        setIsSaving(false)
      }
    },
    [userId, db, photosByDate],
  )

  const uploadDailyPhoto = useCallback(
    async (date, blob) => {
      if (!userId || !date || !blob) return null

      if (!db) {
        throw new Error(photoUnavailableMessage)
      }

      setIsSaving(true)
      setError('')

      try {
        const uploaded = await uploadPhotoToSupabase(db, userId, date, blob)
        const nextPhotos = {
          ...photosByDate,
          [date]: uploaded,
        }

        setPhotosByDate(nextPhotos)
        storeLocalPhotos(userId, nextPhotos)
        setStorageMode('supabase')
        return uploaded
      } catch (uploadError) {
        setStorageMode('local')
        setError(uploadError.message || localFallbackMessage)
        throw uploadError
      } finally {
        setIsSaving(false)
      }
    },
    [userId, db, photosByDate],
  )

  const deleteDailyPhoto = useCallback(
    async (date) => {
      if (!userId || !date) return

      const existing = photosByDate[date]
      if (!existing) return

      if (!db) {
        throw new Error(photoUnavailableMessage)
      }

      setIsSaving(true)
      setError('')

      try {
        await deletePhotoFromSupabase(db, userId, date, existing.storagePath)
        const nextPhotos = { ...photosByDate }
        delete nextPhotos[date]
        setPhotosByDate(nextPhotos)
        storeLocalPhotos(userId, nextPhotos)
        setStorageMode('supabase')
      } catch (deleteError) {
        setStorageMode('local')
        setError(deleteError.message || localFallbackMessage)
        throw deleteError
      } finally {
        setIsSaving(false)
      }
    },
    [userId, db, photosByDate],
  )

  const addEntry = useCallback(
    async (entry, photoBlob = null) => {
      const photoRequired = Boolean(db)

      if (photoRequired && !photoBlob && !photosByDate[entry.date]?.storagePath) {
        throw new Error('Une photo est obligatoire pour enregistrer la pesée.')
      }

      if (photoBlob) {
        await uploadDailyPhoto(entry.date, photoBlob)
      }

      await persist([...entries, createEntry(entry)], settings)
    },
    [entries, settings, persist, uploadDailyPhoto, photosByDate, db],
  )

  const updateEntry = useCallback(
    async (id, data) => {
      const next = entries.map((entry) =>
        entry.id === id ? { ...entry, ...data, weight: Number(data.weight ?? entry.weight) } : entry,
      )
      await persist(next, settings)
    },
    [entries, settings, persist],
  )

  const deleteEntry = useCallback(
    async (id) => {
      const next = entries.filter((entry) => entry.id !== id)
      await persist(next, settings)
    },
    [entries, settings, persist],
  )

  const updateSettings = useCallback(
    async (patch) => {
      const next = { ...settings, ...patch }
      await persist(entries, next)
    },
    [entries, settings, persist],
  )

  const resetSettings = useCallback(async () => {
    await persist(entries, { ...defaultSettings })
  }, [entries, persist])

  const clearAllData = useCallback(async () => {
    if (db && Object.keys(photosByDate).length) {
      await deleteAllPhotosFromSupabase(db, userId, photosByDate)
    }

    setPhotosByDate({})
    storeLocalPhotos(userId, {})
    await persist([], { ...defaultSettings }, {})
    clearLegacyStorage()
    removeFromStorage(getLocalEntriesKey(userId))
    removeFromStorage(getLocalSettingsKey(userId))
    removeFromStorage(getLocalPhotosKey(userId))
  }, [persist, photosByDate, userId, db])

  const clearEntries = useCallback(async () => {
    await clearAllData()
  }, [clearAllData])

  const getMovingAverage = useCallback(
    (windowSize = 7) => {
      const asc = [...entries].reverse()
      return asc.map((entry, i) => {
        const window = asc.slice(Math.max(0, i - windowSize + 1), i + 1)
        const avg = window.reduce((sum, item) => sum + item.weight, 0) / window.length
        return { date: entry.date, avg: round(avg) }
      })
    },
    [entries],
  )

  const hasPhotoForDate = useCallback(
    (date) => Boolean(photosByDate[date]?.storagePath),
    [photosByDate],
  )

  const getPhotoForDate = useCallback((date) => photosByDate[date] ?? null, [photosByDate])

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

  const exportJSON = useCallback(() => {
    const payload = { entries, settings, photosByDate, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `weight-tracker-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [entries, settings, photosByDate])

  const importJSON = useCallback(
    async (file) => {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed.entries)) {
        throw new Error('Invalid backup format')
      }
      const nextSettings = parsed.settings ? mergeSettings(settings, parsed.settings) : settings
      const nextPhotos = parsed.photosByDate ? normalizePhotosMap(parsed.photosByDate) : photosByDate
      await persist(mergeEntries([], normalizeEntries(parsed.entries)), nextSettings, nextPhotos)
      return parsed
    },
    [persist, settings, photosByDate],
  )

  const convertAllUnits = useCallback(
    async (nextUnit) => {
      if (nextUnit === settings.unit) return
      const next = entries.map((entry) => ({
        ...entry,
        weight: round(nextUnit === 'lbs' ? kgToLbs(entry.weight) : lbsToKg(entry.weight)),
      }))
      await persist(next, { ...settings, unit: nextUnit })
    },
    [entries, settings, persist],
  )

  return useMemo(
    () => ({
      entries,
      settings,
      photosByDate,
      userId,
      isLoading,
      hasLoaded,
      isSaving,
      storageMode,
      error,
      isSupabaseConfigured,
      reload: loadData,
      addEntry,
      updateEntry,
      deleteEntry,
      updateSettings,
      resetSettings,
      clearAllData,
      clearEntries,
      getMovingAverage,
      uploadDailyPhoto,
      deleteDailyPhoto,
      hasPhotoForDate,
      getPhotoForDate,
      exportCSV,
      exportJSON,
      importJSON,
      convertAllUnits,
    }),
    [
      entries,
      settings,
      photosByDate,
      userId,
      isLoading,
      hasLoaded,
      isSaving,
      storageMode,
      error,
      loadData,
      addEntry,
      updateEntry,
      deleteEntry,
      updateSettings,
      resetSettings,
      clearAllData,
      clearEntries,
      getMovingAverage,
      uploadDailyPhoto,
      deleteDailyPhoto,
      hasPhotoForDate,
      getPhotoForDate,
      exportCSV,
      exportJSON,
      importJSON,
      convertAllUnits,
    ],
  )
}

export default useSync
