import { useMemo, useState } from 'react'
import BottomNav from './BottomNav'
import AddWeightModal from './components/AddWeightModal'
import InstallAppTutorial from './components/InstallAppTutorial'
import PageTransition from './components/PageTransition'
import WeightPlanModal from './components/WeightPlanModal'
import useEntries from './hooks/useEntries'
import useSettings from './hooks/useSettings'
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
            On récupère votre historique sécurisé depuis Vercel KV avant d'ouvrir l'application.
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
  const [tab, setTab] = useState('dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [planModalDismissed, setPlanModalDismissed] = useState(false)
  const { settings, updateSettings, resetSettings } = useSettings()
  const entriesApi = useEntries(settings.unit, userId)

  const latest = entriesApi.entries[0]
  const canConfigurePlan = Boolean(latest && settings.targetWeight && latest.weight > settings.targetWeight)
  const shouldAutoOpenPlan =
    canConfigurePlan &&
    !settings.planSetupComplete &&
    settings.weeklyPace == null &&
    !planModalDismissed &&
    (tab === 'plan' || tab === 'dashboard')

  const openPlanModal = () => setIsPlanModalOpen(true)
  const closePlanModal = () => {
    setIsPlanModalOpen(false)
    setPlanModalDismissed(true)
    if (!settings.planSetupComplete && settings.weeklyPace == null) {
      updateSettings({ planSetupComplete: true })
    }
  }

  const activeScreen = useMemo(() => {
    switch (tab) {
      case 'log':
        return (
          <LogScreen
            {...entriesApi}
            unit={settings.unit}
            height={settings.height}
            onAdd={() => setIsModalOpen(true)}
          />
        )
      case 'stats':
        return <StatsScreen entries={entriesApi.entries} settings={settings} />
      case 'plan':
        return (
          <PlanScreen entries={entriesApi.entries} settings={settings} onEditPlan={openPlanModal} />
        )
      case 'settings':
        return (
          <SettingsScreen
            entriesApi={entriesApi}
            settings={settings}
            updateSettings={updateSettings}
            resetSettings={resetSettings}
            onEditPlan={openPlanModal}
          />
        )
      default:
        return (
          <DashboardScreen
            entries={entriesApi.entries}
            settings={settings}
            movingAverage={entriesApi.getMovingAverage(7)}
            onAdd={() => setIsModalOpen(true)}
            onEditPlan={openPlanModal}
          />
        )
    }
  }, [tab, entriesApi, settings, updateSettings, resetSettings])

  if (entriesApi.isLoading || !entriesApi.hasLoaded) {
    return <LoadingScreen error={entriesApi.error} onRetry={entriesApi.reload} />
  }

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary">
      <div className="ambient-glow" aria-hidden="true" />
      <main className="relative z-10 mx-auto w-full max-w-md px-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-4">
        <InstallAppTutorial />
        {entriesApi.error ? (
          <div className="mb-3 rounded-2xl border border-accent-red/20 bg-accent-red/10 px-4 py-3 text-[13px] leading-relaxed text-accent-red">
            {entriesApi.error}
          </div>
        ) : null}
        {entriesApi.isSaving ? (
          <div className="mb-3 rounded-2xl border border-border bg-bg-card px-4 py-3 text-[13px] text-text-secondary">
            Synchronisation avec Vercel KV...
          </div>
        ) : null}
        <PageTransition tabKey={tab}>{activeScreen}</PageTransition>
      </main>
      <BottomNav current={tab} onChange={setTab} />
      <AddWeightModal
        isOpen={isModalOpen}
        unit={settings.unit}
        onClose={() => setIsModalOpen(false)}
        onSave={entriesApi.addEntry}
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
