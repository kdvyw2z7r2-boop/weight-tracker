import { useMemo, useState } from 'react'

const SETTINGS_KEY = 'wt_settings'

const defaultSettings = {
  targetWeight: 70,
  height: 178,
  unit: 'kg',
  reminderEnabled: false,
  reminderTime: '08:00',
  theme: 'dark',
}

function useSettings() {
  const [settings, setSettings] = useState(() => {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings
    try {
      const parsed = JSON.parse(raw)
      return { ...defaultSettings, ...parsed }
    } catch {
      return defaultSettings
    }
  })

  const updateSettings = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }

  const resetSettings = () => {
    localStorage.removeItem(SETTINGS_KEY)
    setSettings(defaultSettings)
  }

  return useMemo(
    () => ({
      settings,
      updateSettings,
      resetSettings,
    }),
    [settings],
  )
}

export default useSettings
