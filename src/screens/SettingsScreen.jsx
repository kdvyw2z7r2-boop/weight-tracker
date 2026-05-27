import ExportButton from '../components/ExportButton'

function SettingsScreen({ entriesApi, settings, updateSettings, resetSettings }) {
  const onUnitChange = (nextUnit) => {
    if (nextUnit !== settings.unit) {
      entriesApi.convertAllUnits(nextUnit)
      updateSettings({ unit: nextUnit })
    }
  }

  const onReminderToggle = async (enabled) => {
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        // Ignore permission errors and keep setting change.
      }
    }
    updateSettings({ reminderEnabled: enabled })
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Parametres</h2>

      <div className="rounded-2xl bg-bg-card p-4 space-y-3">
        <label className="block text-sm text-text-secondary">Taille (cm)</label>
        <input
          type="number"
          value={settings.height}
          onChange={(event) => updateSettings({ height: Number(event.target.value) || 0 })}
          className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-2"
        />
        <label className="block text-sm text-text-secondary">Poids cible</label>
        <input
          type="number"
          value={settings.targetWeight}
          onChange={(event) => updateSettings({ targetWeight: Number(event.target.value) || 0 })}
          className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-2"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUnitChange('kg')}
            className={`flex-1 rounded-xl py-2 ${settings.unit === 'kg' ? 'bg-white text-black' : 'border border-border'}`}
          >
            kg
          </button>
          <button
            type="button"
            onClick={() => onUnitChange('lbs')}
            className={`flex-1 rounded-xl py-2 ${settings.unit === 'lbs' ? 'bg-white text-black' : 'border border-border'}`}
          >
            lbs
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-bg-card p-4 space-y-2">
        <p className="text-sm text-text-secondary">Rappels</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Activer les rappels</p>
            <p className="text-xs text-text-secondary">Rappels quotidiens</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.reminderEnabled}
            onClick={() => onReminderToggle(!settings.reminderEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              settings.reminderEnabled ? 'bg-white' : 'bg-bg-elevated'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-black transition ${
                settings.reminderEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {settings.reminderEnabled ? (
          <div>
            <label className="block text-sm text-text-secondary">Heure du rappel</label>
            <input
              type="time"
              value={settings.reminderTime || '08:00'}
              onChange={(event) => updateSettings({ reminderTime: event.target.value || '08:00' })}
              className="mt-1 w-full rounded-xl border border-border bg-bg-elevated px-3 py-2"
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-bg-card p-4 space-y-2">
        <ExportButton onExport={entriesApi.exportCSV} label="Exporter CSV" />
        <ExportButton onExport={() => entriesApi.exportJSON(settings)} label="Exporter JSON" />
        <label className="block cursor-pointer rounded-xl border border-border bg-bg-elevated px-3 py-2">
          Importer JSON
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              try {
                const data = await entriesApi.importJSON(file)
                if (data.settings) updateSettings(data.settings)
                alert('Import termine.')
              } catch {
                alert('Import invalide.')
              }
            }}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => {
          if (window.confirm('Effacer toutes les donnees ?')) {
            localStorage.removeItem('wt_entries')
            resetSettings()
            window.location.reload()
          }
        }}
        className="w-full rounded-xl border border-red-400 py-2 text-red-300"
      >
        Effacer toutes les donnees
      </button>
    </section>
  )
}

export default SettingsScreen
