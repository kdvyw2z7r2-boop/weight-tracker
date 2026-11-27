import { useCallback, useMemo, useState } from 'react'
import BottomNav from './BottomNav'
import AddWeightModal from './components/AddWeightModal'
import InstallAppTutorial from './components/InstallAppTutorial'
import PageTransition from './components/PageTransition'
import PhotoViewerModal from './components/PhotoViewerModal'
import AddPhotoFlow from './components/photos/AddPhotoFlow'
import PhotoTimelapse from './components/photos/PhotoTimelapse'
import WeightPlanModal from './components/WeightPlanModal'
import useDailyReminder from './hooks/useDailyReminder'
import useScrollDirection from './hooks/useScrollDirection'
import useSync from './hooks/useSync'
import { useToast } from './hooks/useToast'
import useUserId from './hooks/useUserId'
import { fetchWithRetry } from './utils/fetchImage'
import { formatDateCompact } from './utils/locale'
import { ghostFor, listPhotos } from './utils/progressPhotos'
import { buildShareCaption, composeShareImage, makeShareFile, shareOrDownload } from './utils/shareImage'
import DashboardScreen from './screens/DashboardScreen'
import LogScreen from './screens/LogScreen'
import PhotosScreen from './screens/PhotosScreen'
import ProgressScreen from './screens/ProgressScreen'
import SettingsScreen from './screens/SettingsScreen'

const SYNC_PILL_TITLES = {
  'local-offline': 'Mode hors ligne : impossible de joindre le cloud pour le moment. Vos données restent sur cet appareil.',
  'local-unconfigured': 'Supabase non configuré : vos données restent sur cet appareil.',
}

function SyncStatusPill({ status }) {
  const title = SYNC_PILL_TITLES[status]
  if (!title) return null
  return (
    <span
      role="status"
      title={title}
      aria-label={`Hors ligne · données locales. ${title}`}
      className="flex h-7 min-w-0 items-center gap-1.5 rounded-full bg-bg-elevated px-2.5 text-[11px] font-medium text-text-secondary"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      <span className="truncate">Hors ligne · données locales</span>
    </span>
  )
}

function LoadingScreen({ error, onRetry }) {
  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary">
      <div className="ambient-glow" aria-hidden="true" />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md items-center px-4">
        <div className="card-base w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-lg font-semibold">Chargement…</h1>
          {error ? (
            <>
              <p className="mt-4 rounded-xl bg-accent-red/10 px-4 py-3 text-sm text-accent-red">{error}</p>
              <button type="button" onClick={onRetry} className="btn-primary mt-5 h-11 px-6 text-[15px]">
                Réessayer
              </button>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}

function App() {
  const userId = useUserId()
  const isScrollingDown = useScrollDirection()
  const sync = useSync(userId)
  const [tab, setTab] = useState('dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [planModalDismissed, setPlanModalDismissed] = useState(false)
  const [photoViewerItem, setPhotoViewerItem] = useState(null)
  const [timelapseOpen, setTimelapseOpen] = useState(false)
  const [photoFlow, setPhotoFlow] = useState(null)
  const [photoFocusDate, setPhotoFocusDate] = useState(null)
  const [addModalDate, setAddModalDate] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const [pendingShare, setPendingShare] = useState(null)
  const { show: showToast } = useToast()

  const { settings, updateSettings } = sync
  const latest = sync.entries[0]
  const canConfigurePlan = Boolean(latest && settings.targetWeight && latest.weight > settings.targetWeight)
  const shouldAutoOpenPlan =
    canConfigurePlan &&
    !settings.planSetupComplete &&
    settings.weeklyPace == null &&
    !planModalDismissed &&
    (tab === 'progress' || tab === 'dashboard')

  const openPlanModal = useCallback(() => setIsPlanModalOpen(true), [])
  const closePlanModal = () => {
    setIsPlanModalOpen(false)
    setPlanModalDismissed(true)
    if (!settings.planSetupComplete && settings.weeklyPace == null) {
      updateSettings({ planSetupComplete: true })
    }
  }

  const openAddModal = useCallback((date = null) => {
    setAddModalDate(date)
    setIsModalOpen(true)
  }, [])

  useDailyReminder({
    userId,
    settings,
    entries: sync.entries,
    onAdd: openAddModal,
    ready: sync.hasLoaded && !sync.isLoading,
  })

  const closeAddModal = useCallback(() => {
    setIsModalOpen(false)
    setAddModalDate(null)
  }, [])

  const changeTab = useCallback((nextTab) => {
    setTab(nextTab)
    setPhotoFocusDate(null)
  }, [])

  const { hasPhotoForDate, deleteDailyPhoto, isSupabaseConfigured } = sync

  const photos = useMemo(() => listPhotos(sync.photosByDate, sync.entries), [sync.photosByDate, sync.entries])
  const { refreshPhotoUrls: refreshUrls } = sync
  const [isRefreshingUrls, setIsRefreshingUrls] = useState(false)
  // Photo sans URL signée : un seul rafraîchissement (appels concurrents mutualisés dans useSync).
  const refreshPhotoUrls = useCallback(async () => {
    setIsRefreshingUrls(true)
    try {
      await refreshUrls()
    } catch {
      showToast('Impossible de recharger les photos.', { tone: 'error' })
    } finally {
      setIsRefreshingUrls(false)
    }
  }, [refreshUrls, showToast])

  const finishShare = useCallback(
    (result) => {
      if (result === 'needs-gesture') return false
      if (result === 'downloaded') showToast('Image téléchargée')
      return true
    },
    [showToast],
  )

  const sharePair = useCallback(
    async (pair, stats) => {
      if (!pair?.after || isSharing) return
      const key = `${pair.before.date}|${pair.after.date}`

      // iOS : le partage a été refusé faute de geste frais ; ce toucher partage le fichier déjà composé.
      if (pendingShare?.key === key) {
        const result = await shareOrDownload(pendingShare.file)
        if (finishShare(result)) setPendingShare(null)
        return
      }

      setIsSharing(true)
      try {
        // Une seule re-signature, partagée par les deux photos si les deux ont expiré.
        let refreshed = null
        const refreshOnce = () => (refreshed ??= refreshUrls())
        const fetchPhoto = (photo) =>
          fetchWithRetry(photo.url, { onExpired: async () => (await refreshOnce())[photo.date]?.url ?? null })
        const [beforeBlob, afterBlob] = await Promise.all([fetchPhoto(pair.before), fetchPhoto(pair.after)])
        const blob = await composeShareImage({
          beforeBlob,
          afterBlob,
          beforeLabel: `Avant · ${formatDateCompact(pair.before.date)}`,
          afterLabel: `Après · ${formatDateCompact(pair.after.date)}`,
          caption: buildShareCaption(stats, settings.unit),
        })
        const file = makeShareFile(blob, pair.after.date)
        const result = await shareOrDownload(file)
        if (!finishShare(result)) setPendingShare({ key, file })
      } catch {
        showToast('Impossible de créer l’image à partager.', { tone: 'error' })
      } finally {
        setIsSharing(false)
      }
    },
    [isSharing, pendingShare, finishShare, refreshUrls, settings.unit, showToast],
  )

  const ghostUrlForDate = useCallback((date) => ghostFor(photos, date)?.url ?? null, [photos])

  // Ajout / remplacement / recadrage : un seul flux guidé (source -> cadrage avec fantôme -> envoi).
  const addPhoto = useCallback((date) => {
    setPhotoFocusDate(date)
    setPhotoFlow({ date, recropUrl: null })
  }, [])
  const replacePhoto = useCallback((date) => setPhotoFlow({ date, recropUrl: null }), [])
  const recropPhoto = useCallback((item) => {
    if (item?.url) setPhotoFlow({ date: item.date, recropUrl: item.url })
  }, [])
  const closePhotoFlow = useCallback(() => setPhotoFlow(null), [])

  const deletePhoto = useCallback(
    async (date) => {
      try {
        await deleteDailyPhoto(date)
        showToast('Photo supprimée')
      } catch (deleteError) {
        showToast(deleteError.message || 'Impossible de supprimer la photo.', { tone: 'error' })
      }
    },
    [deleteDailyPhoto, showToast],
  )

  // Journal : ouvre l'onglet Photos sur ce jour ; sans photo, lance l'ajout pour cette date.
  const handlePhotoPress = useCallback(
    (entry) => {
      setTab('photos')
      setPhotoFocusDate(entry.date)
      // Sans Supabase, l'onglet affiche l'état explicatif : pas de sélecteur de fichier.
      if (isSupabaseConfigured && !hasPhotoForDate(entry.date)) setPhotoFlow({ date: entry.date, recropUrl: null })
    },
    [hasPhotoForDate, isSupabaseConfigured],
  )

  // Photos : pas de FAB (il masquerait les vignettes récentes ; l'écran a son propre bouton principal).
  const showFab = tab !== 'settings' && tab !== 'photos'

  const openTimelapse = useCallback(() => setTimelapseOpen(true), [])
  const closeTimelapse = useCallback(() => setTimelapseOpen(false), [])

  const activeScreen = useMemo(() => {
    switch (tab) {
      case 'log':
        return (
          <LogScreen
            {...sync}
            unit={settings.unit}
            onAdd={() => openAddModal()}
            onPhotoPress={handlePhotoPress}
            hasPhotoForDate={sync.hasPhotoForDate}
          />
        )
      case 'photos':
        return (
          <PhotosScreen
            entries={sync.entries}
            settings={settings}
            photosByDate={sync.photosByDate}
            isSupabaseConfigured={sync.isSupabaseConfigured}
            focusDate={photoFocusDate}
            onAddPhoto={addPhoto}
            onReplacePhoto={replacePhoto}
            onDeletePhoto={deletePhoto}
            onViewPhoto={setPhotoViewerItem}
            onRecropPhoto={recropPhoto}
            onShare={sharePair}
            onPlay={openTimelapse}
            sharing={isSharing}
            sharePendingKey={pendingShare?.key ?? null}
            refreshing={isRefreshingUrls}
            onRefreshUrls={refreshPhotoUrls}
          />
        )
      case 'progress':
        return <ProgressScreen entries={sync.entries} settings={settings} onEditPlan={openPlanModal} />
      case 'settings':
        return (
          <SettingsScreen
            entriesApi={sync}
            settings={settings}
            updateSettings={updateSettings}
            onEditPlan={openPlanModal}
          />
        )
      default:
        return (
          <DashboardScreen
            entries={sync.entries}
            settings={settings}
            movingAverage={sync.getMovingAverage(7)}
            onAdd={() => openAddModal()}
            onEditPlan={openPlanModal}
          />
        )
    }
  }, [
    tab,
    sync,
    settings,
    updateSettings,
    openPlanModal,
    openAddModal,
    handlePhotoPress,
    photoFocusDate,
    addPhoto,
    replacePhoto,
    deletePhoto,
    recropPhoto,
    sharePair,
    openTimelapse,
    isSharing,
    pendingShare,
    isRefreshingUrls,
    refreshPhotoUrls,
  ])

  if (sync.isLoading || !sync.hasLoaded) {
    return <LoadingScreen error={sync.error} onRetry={sync.reload} />
  }

  const photoViewerPhoto = photoViewerItem ? sync.getPhotoForDate(photoViewerItem.date) : null

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary">
      <div className="ambient-glow" aria-hidden="true" />
      <main className="relative z-10 mx-auto w-full max-w-md px-4 pb-[calc(var(--nav-h)+56px+16px)] pt-4">
        <InstallAppTutorial leading={tab === 'dashboard' ? <SyncStatusPill status={sync.syncStatus} /> : null} />
        {sync.error ? (
          <div className="mb-3 rounded-2xl border border-accent-red/20 bg-accent-red/10 px-4 py-3 text-[13px] leading-relaxed text-accent-red">
            {sync.error}
          </div>
        ) : null}
        <PageTransition tabKey={tab}>{activeScreen}</PageTransition>
      </main>

      {showFab ? (
        <button
          type="button"
          onClick={() => openAddModal()}
          className="fab"
          data-hidden={isScrollingDown}
          aria-label="Ajouter une pesée"
        >
          +
        </button>
      ) : null}

      <BottomNav current={tab} onChange={changeTab} />

      <AddWeightModal
        key={isModalOpen ? `add-${addModalDate ?? 'today'}` : 'add-closed'}
        isOpen={isModalOpen}
        unit={settings.unit}
        onClose={closeAddModal}
        onSave={sync.addEntry}
        initial={addModalDate ? { date: addModalDate } : null}
        getPhotoForDate={sync.getPhotoForDate}
        getGhostUrl={ghostUrlForDate}
        isSaving={sync.isSaving}
        isSupabaseConfigured={sync.isSupabaseConfigured}
      />
      <AddPhotoFlow
        key={photoFlow ? `flow-${photoFlow.date}-${photoFlow.recropUrl ? 'recrop' : 'pick'}` : 'flow-closed'}
        open={Boolean(photoFlow)}
        date={photoFlow?.date}
        recropUrl={photoFlow?.recropUrl}
        photos={photos}
        onUpload={sync.uploadDailyPhoto}
        onClose={closePhotoFlow}
      />
      {timelapseOpen ? (
        <PhotoTimelapse photos={photos} unit={settings.unit} onClose={closeTimelapse} />
      ) : null}
      <PhotoViewerModal
        key={photoViewerItem ? `photo-${photoViewerItem.date}` : 'photo-closed'}
        isOpen={Boolean(photoViewerItem && photoViewerPhoto)}
        onClose={() => setPhotoViewerItem(null)}
        date={photoViewerItem?.date}
        photoUrl={photoViewerPhoto?.url}
        weight={photoViewerItem?.weight}
        unit={settings.unit}
      />
      <WeightPlanModal
        key={`plan-${settings.weeklyPace ?? 'new'}-${isPlanModalOpen || shouldAutoOpenPlan}`}
        isOpen={isPlanModalOpen || shouldAutoOpenPlan}
        onClose={closePlanModal}
        onSave={updateSettings}
        onRemove={() =>
          updateSettings({
            weeklyPace: null,
            planSetupComplete: true,
            planStartDate: null,
            planStartWeight: null,
          })
        }
        startWeight={settings.planStartWeight ?? latest?.weight}
        targetWeight={settings.targetWeight}
        startDate={settings.planStartDate ?? latest?.date}
        weeklyPace={settings.weeklyPace}
        unit={settings.unit}
      />
    </div>
  )
}

export default App
