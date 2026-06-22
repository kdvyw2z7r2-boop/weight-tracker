import { useCallback, useMemo, useState } from 'react'
import BottomNav from './BottomNav'
import AddWeightModal from './components/AddWeightModal'
import InstallAppTutorial from './components/InstallAppTutorial'
import PageTransition from './components/PageTransition'
import PhotoActionSheet from './components/PhotoActionSheet'
import PhotoCompareModal from './components/PhotoCompareModal'
import PhotoViewerModal from './components/PhotoViewerModal'
import WeightPlanModal from './components/WeightPlanModal'
import useSync from './hooks/useSync'
import useUserId from './hooks/useUserId'
import { buildEntryComparePair } from './utils/progressPhotos'
import DashboardScreen from './screens/DashboardScreen'
import LogScreen from './screens/LogScreen'
import ProgressScreen from './screens/ProgressScreen'
import SettingsScreen from './screens/SettingsScreen'

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
  const sync = useSync(userId)
  const [tab, setTab] = useState('dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [planModalDismissed, setPlanModalDismissed] = useState(false)
  const [photoActionEntry, setPhotoActionEntry] = useState(null)
  const [photoViewerEntry, setPhotoViewerEntry] = useState(null)
  const [photoCompareEntry, setPhotoCompareEntry] = useState(null)
  const [addModalDate, setAddModalDate] = useState(null)

  const { settings, updateSettings, resetSettings } = sync
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

  const closeAddModal = useCallback(() => {
    setIsModalOpen(false)
    setAddModalDate(null)
  }, [])

  const handlePhotoPress = useCallback((entry) => {
    setPhotoActionEntry(entry)
  }, [])

  const closePhotoAction = useCallback(() => {
    setPhotoActionEntry(null)
  }, [])

  const openPhotoViewer = useCallback((entry) => {
    setPhotoActionEntry(null)
    setPhotoViewerEntry(entry)
  }, [])

  const closePhotoViewer = useCallback(() => {
    setPhotoViewerEntry(null)
  }, [])

  const openPhotoCompare = useCallback((entry) => {
    setPhotoActionEntry(null)
    setPhotoViewerEntry(null)
    setPhotoCompareEntry(entry)
  }, [])

  const closePhotoCompare = useCallback(() => {
    setPhotoCompareEntry(null)
  }, [])

  const showFab = tab !== 'settings'

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
      case 'progress':
        return <ProgressScreen entries={sync.entries} settings={settings} onEditPlan={openPlanModal} />
      case 'settings':
        return (
          <SettingsScreen
            entriesApi={sync}
            settings={settings}
            updateSettings={updateSettings}
            resetSettings={resetSettings}
            onEditPlan={openPlanModal}
          />
        )
      default:
        return (
          <DashboardScreen
            entries={sync.entries}
            settings={settings}
            movingAverage={sync.getMovingAverage(7)}
            photosByDate={sync.photosByDate}
            onAdd={() => openAddModal()}
            onEditPlan={openPlanModal}
          />
        )
    }
  }, [tab, sync, settings, updateSettings, resetSettings, openPlanModal, openAddModal, handlePhotoPress])

  if (sync.isLoading || !sync.hasLoaded) {
    return <LoadingScreen error={sync.error} onRetry={sync.reload} />
  }

  const photoViewerPhoto = photoViewerEntry ? sync.getPhotoForDate(photoViewerEntry.date) : null
  const photoComparePair = photoCompareEntry
    ? buildEntryComparePair(sync.photosByDate, sync.entries, photoCompareEntry.date)
    : null
  const getCanCompare = (entry) =>
    entry ? buildEntryComparePair(sync.photosByDate, sync.entries, entry.date) != null : false

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary">
      <div className="grid-overlay" aria-hidden="true" />
      <div className="ambient-glow" aria-hidden="true" />
      <div className="scanline-overlay" aria-hidden="true" />
      <main className="relative z-10 mx-auto w-full max-w-md px-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-4">
        <InstallAppTutorial />
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
          aria-label="Ajouter une pesée"
        >
          +
        </button>
      ) : null}

      <BottomNav current={tab} onChange={setTab} />

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
      <PhotoActionSheet
        key={photoActionEntry ? `photo-action-${photoActionEntry.id}` : 'photo-action-closed'}
        isOpen={Boolean(photoActionEntry)}
        onClose={closePhotoAction}
        date={photoActionEntry?.date}
        weight={photoActionEntry?.weight}
        unit={settings.unit}
        hasPhoto={photoActionEntry ? sync.hasPhotoForDate(photoActionEntry.date) : false}
        canCompare={getCanCompare(photoActionEntry)}
        isSaving={sync.isSaving}
        onUpload={async (blob) => {
          if (!photoActionEntry) return
          await sync.uploadDailyPhoto(photoActionEntry.date, blob)
        }}
        onView={() => {
          if (!photoActionEntry) return
          openPhotoViewer(photoActionEntry)
        }}
        onCompare={() => {
          if (!photoActionEntry) return
          openPhotoCompare(photoActionEntry)
        }}
      />
      <PhotoViewerModal
        key={photoViewerEntry ? `photo-${photoViewerEntry.id}` : 'photo-closed'}
        isOpen={Boolean(photoViewerEntry)}
        onClose={closePhotoViewer}
        date={photoViewerEntry?.date}
        photoUrl={photoViewerPhoto?.url}
        weight={photoViewerEntry?.weight}
        unit={settings.unit}
        canCompare={getCanCompare(photoViewerEntry)}
        isSaving={sync.isSaving}
        onChangePhoto={async (blob) => {
          if (!photoViewerEntry) return
          await sync.uploadDailyPhoto(photoViewerEntry.date, blob)
        }}
        onDeletePhoto={async () => {
          if (!photoViewerEntry) return
          await sync.deleteDailyPhoto(photoViewerEntry.date)
        }}
        onCompare={() => {
          if (!photoViewerEntry) return
          openPhotoCompare(photoViewerEntry)
        }}
      />
      <PhotoCompareModal
        key={photoCompareEntry ? `photo-compare-${photoCompareEntry.id}` : 'photo-compare-closed'}
        isOpen={Boolean(photoCompareEntry && photoComparePair)}
        onClose={closePhotoCompare}
        pair={photoComparePair}
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
