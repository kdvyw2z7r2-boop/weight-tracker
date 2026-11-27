import { useCallback, useMemo, useRef, useState } from 'react'
import BottomNav from './BottomNav'
import AddWeightModal from './components/AddWeightModal'
import InstallAppTutorial from './components/InstallAppTutorial'
import PageTransition from './components/PageTransition'
import PhotoViewerModal from './components/PhotoViewerModal'
import QuickPhotoFlow from './components/photos/QuickPhotoFlow'
import WeightPlanModal from './components/WeightPlanModal'
import useDailyReminder from './hooks/useDailyReminder'
import useScrollDirection from './hooks/useScrollDirection'
import useSync from './hooks/useSync'
import { useToast } from './hooks/useToast'
import useUserId from './hooks/useUserId'
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
  const [photoFocusDate, setPhotoFocusDate] = useState(null)
  const [addModalDate, setAddModalDate] = useState(null)
  const photoFlowRef = useRef(null)
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

  // Ajout / remplacement / recadrage : point unique, remplacé par l'ajout guidé (Task 5).
  const addPhoto = useCallback((date) => {
    setPhotoFocusDate(date)
    photoFlowRef.current?.pick(date)
  }, [])
  const replacePhoto = useCallback((date) => photoFlowRef.current?.pick(date), [])
  const recropPhoto = useCallback((item) => photoFlowRef.current?.recrop(item), [])

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
      if (isSupabaseConfigured && !hasPhotoForDate(entry.date)) photoFlowRef.current?.pick(entry.date)
    },
    [hasPhotoForDate, isSupabaseConfigured],
  )

  // Photos : pas de FAB (il masquerait les vignettes récentes ; l'écran a son propre bouton principal).
  const showFab = tab !== 'settings' && tab !== 'photos'

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
        isSaving={sync.isSaving}
        isSupabaseConfigured={sync.isSupabaseConfigured}
      />
      <QuickPhotoFlow ref={photoFlowRef} onUpload={sync.uploadDailyPhoto} />
      <PhotoViewerModal
        key={photoViewerItem ? `photo-${photoViewerItem.date}` : 'photo-closed'}
        isOpen={Boolean(photoViewerItem && photoViewerPhoto)}
        onClose={() => setPhotoViewerItem(null)}
        date={photoViewerItem?.date}
        photoUrl={photoViewerPhoto?.url}
        weight={photoViewerItem?.weight}
        unit={settings.unit}
        isSaving={sync.isSaving}
        onChangePhoto={async (blob) => {
          if (!photoViewerItem) return
          await sync.uploadDailyPhoto(photoViewerItem.date, blob)
        }}
        onDeletePhoto={async () => {
          if (!photoViewerItem) return
          await sync.deleteDailyPhoto(photoViewerItem.date)
        }}
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
