import { useMemo, useState } from 'react'
import BottomNav from './BottomNav'
import AddWeightModal from './components/AddWeightModal'
import PageTransition from './components/PageTransition'
import WeightPlanModal from './components/WeightPlanModal'
import useEntries from './hooks/useEntries'
import useSettings from './hooks/useSettings'
import DashboardScreen from './screens/DashboardScreen'
import LogScreen from './screens/LogScreen'
import PlanScreen from './screens/PlanScreen'
import SettingsScreen from './screens/SettingsScreen'
import StatsScreen from './screens/StatsScreen'

function App() {
  const [tab, setTab] = useState('dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [planModalDismissed, setPlanModalDismissed] = useState(false)
  const { settings, updateSettings, resetSettings } = useSettings()
  const entriesApi = useEntries(settings.unit)

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

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary">
      <div className="ambient-glow" aria-hidden="true" />
      <main className="relative z-10 mx-auto w-full max-w-md px-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-4">
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
