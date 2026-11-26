import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { createSupabaseClient, isSupabaseConfigured, PHOTO_BUCKET } from '../lib/supabase'
import { createSignedPhotoUrl, photoStoragePath } from '../utils/photo'
import { convertSettingsUnit, convertWeightValue } from '../utils/units'
import {
  defaultSettings,
  mergeEntries,
  mergeForSave,
  mergeSettings,
  normalizeSettings,
  pruneMarkers,
  sameTombstones,
  sortByDateDesc,
  updateSyncMarkers,
} from '../utils/syncMerge'
import { createSaveQueue } from '../utils/saveQueue'

const API_ENDPOINT = '/api/sync'
const LEGACY_ENTRIES_KEY = 'wt_entries'
const LEGACY_SETTINGS_KEY = 'wt_settings'
const USER_ENTRIES_PREFIX = 'wt_entries:'
const USER_SETTINGS_PREFIX = 'wt_settings:'
const USER_PHOTOS_PREFIX = 'wt_photos:'
const BACKGROUND_REFRESH_MIN_MS = 30 * 1000

export { defaultSettings }

const round = (value) => Math.round(value * 100) / 100

const photoUnavailableMessage = 'Photos indisponibles hors connexion au cloud.'

function formatStorageError(error) {
  const message = error?.message ?? ''
  if (/bucket not found/i.test(message)) {
    return 'Bucket Storage « progress-photos » introuvable. Créez-le dans Supabase (Storage) ou exécutez supabase/storage.sql.'
  }
  return message || 'Impossible d’enregistrer la photo.'
}

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

function normalizePhotosMap(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return Object.fromEntries(
    Object.entries(raw).filter(([date, photo]) => date && photo?.storagePath),
  )
}

function sameEntryIds(a, b) {
  if (a.length !== b.length) return false
  const ids = new Set(a.map((entry) => entry.id))
  return b.every((entry) => ids.has(entry.id))
}

/** Faut-il renvoyer le résultat fusionné au cloud ? (ids, réglages ou marqueurs différents) */
function needsCloudResave(mergedEntries, mergedSettings, cloud) {
  const { deletedEntries: mergedDeleted, restoredEntries: mergedRestored, ...mergedRest } = mergedSettings
  const {
    deletedEntries: cloudDeleted,
    restoredEntries: cloudRestored,
    ...cloudRest
  } = normalizeSettings(cloud.settings ?? defaultSettings)
  return (
    !sameEntryIds(mergedEntries, cloud.entries) ||
    JSON.stringify(mergedRest) !== JSON.stringify(cloudRest) ||
    !sameTombstones(mergedDeleted, cloudDeleted) ||
    !sameTombstones(mergedRestored, cloudRestored)
  )
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

/** Entrées + réglages seulement (lecture avant écriture d'une sauvegarde). */
async function fetchSupabaseCore(db, userId) {
  const [entriesResult, settingsResult] = await Promise.all([
    db.from('entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
    db.from('user_settings').select('settings').eq('user_id', userId).maybeSingle(),
  ])

  if (entriesResult.error) throw entriesResult.error
  if (settingsResult.error) throw settingsResult.error

  return {
    entries: normalizeEntries((entriesResult.data ?? []).map(rowToEntry)),
    settings: settingsResult.data?.settings ? normalizeSettings(settingsResult.data.settings) : null,
  }
}

async function fetchSupabaseData(db, userId) {
  const [{ entries, settings }, photosResult] = await Promise.all([
    fetchSupabaseCore(db, userId),
    db.from('daily_photos').select('date, storage_path').eq('user_id', userId),
  ])

  if (photosResult.error) throw photosResult.error

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

  if (uploadError) {
    throw new Error(formatStorageError(uploadError))
  }

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
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'cloud' : 'local-unconfigured')

  const db = useMemo(() => createSupabaseClient(userId), [userId])
  // Une sauvegarde cloud à la fois ; les demandes rapprochées sont fusionnées (la plus récente gagne).
  const [saveQueue] = useState(createSaveQueue)
  const persistSeqRef = useRef(0)
  const savingCountRef = useRef(0)
  const lastLoadRef = useRef(0)
  const loadingRef = useRef(false)

  const beginSave = useCallback(() => {
    savingCountRef.current += 1
    setIsSaving(true)
  }, [])

  const endSave = useCallback(() => {
    savingCountRef.current = Math.max(0, savingCountRef.current - 1)
    if (savingCountRef.current === 0) setIsSaving(false)
  }, [])

  /** Sauvegarde lecture-fusion-écriture, sérialisée : renvoie le résultat effectivement écrit. */
  const saveMerged = useCallback(
    (local) =>
      saveQueue.enqueue(async () => {
        const cloud = db ? await fetchSupabaseCore(db, userId) : await fetchCloudData(userId)
        const merged = mergeForSave(local, cloud)
        if (db) {
          await saveSupabaseData(db, userId, merged.entries, merged.settings)
        } else {
          await saveCloudData(userId, merged.entries, merged.settings)
        }
        return merged
      }),
    [saveQueue, db, userId],
  )

  const applyMerged = useCallback(
    (merged, current) => {
      const nextEntries = normalizeEntries(merged.entries)
      const nextSettings = normalizeSettings(merged.settings)
      if (JSON.stringify(nextEntries) !== JSON.stringify(current.entries)) {
        setEntries(nextEntries)
        storeLocalEntries(userId, nextEntries)
      }
      if (JSON.stringify(nextSettings) !== JSON.stringify(current.settings)) {
        setSettings(nextSettings)
        storeLocalSettings(userId, nextSettings)
      }
    },
    [userId],
  )

  const loadData = useCallback(
    async (options) => {
      if (!userId) return
      const background = Boolean(options?.background)
      if (background && loadingRef.current) return

      loadingRef.current = true
      lastLoadRef.current = Date.now()
      const seqAtStart = persistSeqRef.current
      const isStale = () => persistSeqRef.current !== seqAtStart

      if (!background) {
        setIsLoading(true)
        setHasLoaded(false)
        setError('')
      }

      const now = Date.now()
      const localEntries = readLocalEntries(userId)
      const localSettings = mergeSettings(readLocalSettings(userId), null, now)
      const localPhotos = readLocalPhotos(userId)
      // Données à afficher si le cloud échoue : le local, ou la fusion si elle a déjà eu lieu.
      let fallback = { entries: localEntries, settings: localSettings, photos: localPhotos }

      try {
        const cloud = db ? await fetchSupabaseData(db, userId) : await fetchCloudData(userId)
        // Un persist a eu lieu pendant le chargement : il fait sa propre fusion avec le cloud.
        if (isStale()) return

        const mergedSettings = mergeSettings(localSettings, cloud.settings, now)
        let mergedEntries = mergeEntries(
          cloud.entries,
          localEntries,
          mergedSettings.deletedEntries,
          mergedSettings.restoredEntries,
        )
        let finalSettings = mergedSettings
        const cloudPhotos = cloud.photosByDate ?? {}
        const mergedPhotos = db && Object.keys(cloudPhotos).length > 0 ? cloudPhotos : localPhotos

        storeLocalEntries(userId, mergedEntries)
        storeLocalSettings(userId, mergedSettings)
        storeLocalPhotos(userId, mergedPhotos)
        clearLegacyStorage()
        fallback = { entries: mergedEntries, settings: mergedSettings, photos: mergedPhotos }

        const cloudWasEmpty =
          cloud.entries.length === 0 && !cloud.settings && Object.keys(cloudPhotos).length === 0
        const hasLocalData =
          localEntries.length > 0 ||
          JSON.stringify(localSettings) !== JSON.stringify(defaultSettings) ||
          (db && Object.keys(localPhotos).length > 0)

        if ((cloudWasEmpty && hasLocalData) || needsCloudResave(mergedEntries, mergedSettings, cloud)) {
          beginSave()
          try {
            const saved = await saveMerged({ entries: mergedEntries, settings: mergedSettings })
            mergedEntries = normalizeEntries(saved.entries)
            finalSettings = normalizeSettings(saved.settings)
          } finally {
            endSave()
          }
          if (isStale()) return
          storeLocalEntries(userId, mergedEntries)
          storeLocalSettings(userId, finalSettings)
        }

        setEntries(mergedEntries)
        setSettings(finalSettings)
        setPhotosByDate(mergedPhotos)
        setStorageMode(db ? 'supabase' : 'cloud')
        setSyncStatus('cloud')
        setHasLoaded(true)
      } catch (loadError) {
        if (isStale()) return
        storeLocalEntries(userId, fallback.entries)
        storeLocalSettings(userId, fallback.settings)
        storeLocalPhotos(userId, fallback.photos)
        setEntries(fallback.entries)
        setSettings(fallback.settings)
        setPhotosByDate(fallback.photos)
        setStorageMode('local')
        setSyncStatus(db ? 'local-offline' : 'local-unconfigured')
        setHasLoaded(true)
        console.error('Cloud sync failed:', loadError)
      } finally {
        loadingRef.current = false
        if (!background) {
          setIsLoading(false)
          setHasLoaded(true)
        }
      }
    },
    [userId, db, saveMerged, beginSave, endSave],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  // Retour au premier plan : rafraîchissement discret (sans écran de chargement), au plus toutes les 30 s.
  useEffect(() => {
    if (!userId) return undefined
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastLoadRef.current < BACKGROUND_REFRESH_MIN_MS) return
      loadData({ background: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId, loadData])

  const persist = useCallback(
    async (nextEntries, nextSettings, nextPhotos = photosByDate) => {
      if (!userId) {
        setStorageMode('local')
        setSyncStatus(db ? 'local-offline' : 'local-unconfigured')
        return
      }

      const now = Date.now()
      const sortedEntries = normalizeEntries(nextEntries)
      const baseSettings = normalizeSettings(nextSettings)
      const normalizedSettings = pruneMarkers(
        { ...baseSettings, ...updateSyncMarkers(baseSettings, entries, sortedEntries, now) },
        now,
      )
      const normalizedPhotos = normalizePhotosMap(nextPhotos)
      const seq = ++persistSeqRef.current

      setEntries(sortedEntries)
      setSettings(normalizedSettings)
      setPhotosByDate(normalizedPhotos)
      storeLocalEntries(userId, sortedEntries)
      storeLocalSettings(userId, normalizedSettings)
      storeLocalPhotos(userId, normalizedPhotos)
      beginSave()
      setError('')

      try {
        const merged = await saveMerged({ entries: sortedEntries, settings: normalizedSettings })
        clearLegacyStorage()
        setStorageMode(db ? 'supabase' : 'cloud')
        setSyncStatus('cloud')
        // N'applique le résultat fusionné que si aucun changement local plus récent n'a eu lieu.
        if (seq === persistSeqRef.current) {
          applyMerged(merged, { entries: sortedEntries, settings: normalizedSettings })
        }
      } catch {
        setStorageMode('local')
        setSyncStatus(db ? 'local-offline' : 'local-unconfigured')
      } finally {
        endSave()
      }
    },
    [userId, db, photosByDate, entries, saveMerged, applyMerged, beginSave, endSave],
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
        const message = uploadError.message || 'Impossible d\'envoyer la photo.'
        setError(message)
        throw new Error(message, { cause: uploadError })
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
        setError(deleteError.message || 'Impossible de supprimer la photo.')
        throw deleteError
      } finally {
        setIsSaving(false)
      }
    },
    [userId, db, photosByDate],
  )

  const addEntry = useCallback(
    async (entry, photoBlobArg = null) => {
      const photoBlob = photoBlobArg ?? entry.photoBlob ?? null
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

  const deleteEntries = useCallback(
    async (ids) => {
      const toRemove = new Set(ids)
      const next = entries.filter((entry) => !toRemove.has(entry.id))
      await persist(next, settings)
    },
    [entries, settings, persist],
  )

  const deleteEntry = useCallback((id) => deleteEntries([id]), [deleteEntries])

  const updateSettings = useCallback(
    async (patch) => {
      const next = { ...settings, ...patch }
      await persist(entries, next)
    },
    [entries, settings, persist],
  )

  const clearAllData = useCallback(async () => {
    if (db && Object.keys(photosByDate).length) {
      await deleteAllPhotosFromSupabase(db, userId, photosByDate)
    }

    setPhotosByDate({})
    storeLocalPhotos(userId, {})
    // Réglages par défaut, mais on garde les marqueurs de synchro (sinon les suppressions seraient perdues).
    await persist(
      [],
      { ...defaultSettings, deletedEntries: settings.deletedEntries, restoredEntries: settings.restoredEntries },
      {},
    )
    clearLegacyStorage()
    // La clé des réglages est conservée : elle porte les tombstones jusqu'à leur synchro.
    removeFromStorage(getLocalEntriesKey(userId))
    removeFromStorage(getLocalPhotosKey(userId))
  }, [persist, photosByDate, userId, db, settings])

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
      const next = entries.map((entry) => ({ ...entry, weight: convertWeightValue(entry.weight, nextUnit) }))
      await persist(next, convertSettingsUnit(settings, nextUnit))
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
      syncStatus,
      error,
      isSupabaseConfigured,
      reload: loadData,
      addEntry,
      updateEntry,
      deleteEntry,
      deleteEntries,
      updateSettings,
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
      syncStatus,
      error,
      loadData,
      addEntry,
      updateEntry,
      deleteEntry,
      deleteEntries,
      updateSettings,
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
