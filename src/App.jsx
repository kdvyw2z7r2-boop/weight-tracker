import { useCallback, useMemo, useState } from 'react'
import BottomNav from './BottomNav'
import AddWeightModal from './components/AddWeightModal'
import InstallAppTutorial from './components/InstallAppTutorial'
import PageTransition from './components/PageTransition'
import PhotoViewerModal from './components/PhotoViewerModal'
import WeightPlanModal from './components/WeightPlanModal'
import useSync from './hooks/useSync'
import useUserId from './hooks/useUserId'
import DashboardScreen from './screens/DashboardScreen'
import LogScreen from './screens/LogScreen'
import PlanScreen from './screens/PlanScreen'
import SettingsScreen from './screens/SettingsScreen'
import StatsScreen from './screens/StatsScreen'

function LoadingScreen({ error, onRetry }) {
  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary">
      <div className="ambient-glow" aria-hidden="true" />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md items-center px-4">
        <div className="card-base w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-lg font-semibold">Chargement de vos données</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-text-tertiary">
            On récupère votre historique sécurisé depuis Supabase avant d'ouvrir l'application.
          </p>
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
  const [photoViewerEntry, setPhotoViewerEntry] = useState(null)
  const [addModalDate, setAddModalDate] = useState(null)

  const { settings, updateSettings, resetSettings } = sync
  const latest = sync.entries[0]
  const canConfigurePlan = Boolean(latest && settings.targetWeight && latest.weight > settings.targetWeight)
  const shouldAutoOpenPlan =
    canConfigurePlan &&
    !settings.planSetupComplete &&
    settings.weeklyPace == null &&
    !planModalDismissed &&
    (tab === 'plan' || tab === 'dashboard')

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
    setPhotoViewerEntry(entry)
  }, [])

  const closePhotoViewer = useCallback(() => {
    setPhotoViewerEntry(null)
  }, [])

  const activeScreen = useMemo(() => {
    switch (tab) {
      case 'log':
        return (
          <LogScreen
            {...sync}
            unit={settings.unit}
            height={settings.height}
            onAdd={() => openAddModal()}
            onPhotoPress={handlePhotoPress}
            hasPhotoForDate={sync.hasPhotoForDate}
          />
        )
      case 'stats':
        return <StatsScreen entries={sync.entries} settings={settings} />
      case 'plan':
        return <PlanScreen entries={sync.entries} settings={settings} onEditPlan={openPlanModal} />
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

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary">
      <div className="ambient-glow" aria-hidden="true" />
      <main className="relative z-10 mx-auto w-full max-w-md px-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-4">
        <InstallAppTutorial />
        {sync.error ? (
          <div className="mb-3 rounded-2xl border border-accent-red/20 bg-accent-red/10 px-4 py-3 text-[13px] leading-relaxed text-accent-red">
            {sync.error}
          </div>
        ) : null}
        {sync.isSaving ? (
          <div className="mb-3 rounded-2xl border border-border bg-bg-card px-4 py-3 text-[13px] text-text-secondary">
            Synchronisation avec Supabase...
          </div>
        ) : null}
        <PageTransition tabKey={tab}>{activeScreen}</PageTransition>
      </main>
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
      <PhotoViewerModal
        key={photoViewerEntry ? `photo-${photoViewerEntry.id}` : 'photo-closed'}
        isOpen={Boolean(photoViewerEntry)}
        onClose={closePhotoViewer}
        date={photoViewerEntry?.date}
        photoUrl={photoViewerPhoto?.url}
        weight={photoViewerEntry?.weight}
        unit={settings.unit}
        isSaving={sync.isSaving}
        onChangePhoto={async (blob) => {
          if (!photoViewerEntry) return
          await sync.uploadDailyPhoto(photoViewerEntry.date, blob)
        }}
        onDeletePhoto={async () => {
          if (!photoViewerEntry) return
          await sync.deleteDailyPhoto(photoViewerEntry.date)
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
