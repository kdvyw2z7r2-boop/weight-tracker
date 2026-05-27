import { useMemo, useState } from 'react'
import BottomNav from './BottomNav'
import AddWeightModal from './components/AddWeightModal'
import PageTransition from './components/PageTransition'
import useEntries from './hooks/useEntries'
import useSettings from './hooks/useSettings'
import DashboardScreen from './screens/DashboardScreen'
import LogScreen from './screens/LogScreen'
import SettingsScreen from './screens/SettingsScreen'
import StatsScreen from './screens/StatsScreen'

function App() {
  const [tab, setTab] = useState('dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { settings, updateSettings, resetSettings } = useSettings()
  const entriesApi = useEntries(settings.unit)

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
      case 'settings':
        return (
          <SettingsScreen
            entriesApi={entriesApi}
            settings={settings}
            updateSettings={updateSettings}
            resetSettings={resetSettings}
          />
        )
      default:
        return (
          <DashboardScreen
            entries={entriesApi.entries}
            settings={settings}
            movingAverage={entriesApi.getMovingAverage(7)}
            onAdd={() => setIsModalOpen(true)}
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
    </div>
  )
}

export default App
