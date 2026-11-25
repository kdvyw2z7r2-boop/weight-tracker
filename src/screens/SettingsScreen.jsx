import { useState } from 'react'
import ExportButton from '../components/ExportButton'
import { buildChallengeResetPatch, resolveChallengeStart, todayIso } from '../utils/challenge'
import { formatDateShort } from '../utils/locale'
import { formatPace, formatWeight } from '../utils/weightPlan'

function IOSSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`press-button relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? 'bg-accent-green' : 'bg-bg-elevated'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function ChallengeCard({ entries, settings, updateSettings }) {
  const [date, setDate] = useState(todayIso())
  const today = todayIso()
  const start = resolveChallengeStart(settings, entries)
  const isCustom = Boolean(settings.challengeStartDate)

  const onRestart = async () => {
    const label = date === today ? "aujourd'hui" : `le ${formatDateShort(date)}`
    const message =
      `Recommencer le défi à partir de ${label} ?\n\n` +
      'Le départ, la progression et le plan repartiront de cette date. ' +
      'Vos pesées et photos sont conservées dans l\'historique.'
    if (!window.confirm(message)) return
    try {
      await updateSettings(buildChallengeResetPatch(entries, date, settings))
    } catch {
      alert('Impossible de redémarrer le défi pour le moment.')
    }
  }

  const onRestoreOrigin = async () => {
    if (!window.confirm('Reprendre le défi depuis votre toute première pesée ?')) return
    const patch = { challengeStartDate: null, challengeStartWeight: null }
    if (settings.weeklyPace != null) {
      patch.planStartDate = null
      patch.planStartWeight = null
    }
    await updateSettings(patch)
  }

  return (
    <div className="animate-fade-up animate-stagger-2">
      <p className="section-label mb-3">Défi</p>
      <div className="card-base space-y-4">
        <div>
          <p className="text-sm font-medium text-text-primary">Point de départ</p>
          <p className="mt-0.5 text-[13px] text-text-tertiary">
            {start
              ? `${formatDateShort(start.startDate)} · ${formatWeight(start.startWeight, settings.unit)} ${settings.unit}`
              : 'Aucune pesée pour le moment'}
          </p>
        </div>
        <div>
          <label htmlFor="challenge-date" className="mb-2 block text-sm text-text-secondary">
            Nouvelle date de départ
          </label>
          <input
            id="challenge-date"
            type="date"
            value={date}
            max={today}
            onChange={(event) => setDate(event.target.value || today)}
            className="h-12 w-full rounded-xl border border-transparent bg-bg-card px-4 text-base text-white outline-none transition duration-200 focus:border-white/20 [color-scheme:dark]"
          />
        </div>
        <button
          type="button"
          onClick={onRestart}
          disabled={!entries.length}
          className="press-button h-12 w-full rounded-xl bg-accent-green/15 text-[15px] font-medium text-accent-green disabled:opacity-40"
        >
          Recommencer le défi à zéro
        </button>
        {isCustom ? (
          <button
            type="button"
            onClick={onRestoreOrigin}
            className="press-button w-full text-center text-[13px] text-text-tertiary underline-offset-2 hover:underline"
          >
            Reprendre depuis la première pesée
          </button>
        ) : null}
      </div>
    </div>
  )
}

function SettingsScreen({ entriesApi, settings, updateSettings, resetSettings, onEditPlan }) {
  const onUnitChange = async (nextUnit) => {
    if (nextUnit === settings.unit) return

    try {
      await entriesApi.convertAllUnits(nextUnit)
    } catch {
      alert('Impossible de convertir les données pour le moment.')
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

  const inputClass =
    'h-12 w-full rounded-xl border border-transparent bg-bg-card px-4 text-base text-white outline-none transition duration-200 focus:border-white/20'

  return (
    <section className="space-y-4">
      <div className="animate-fade-up">
        <h2 className="text-[18px] font-semibold">Paramètres</h2>
        <p className="mt-0.5 text-[13px] text-text-tertiary">Profil et préférences</p>
      </div>

      <div className="animate-fade-up animate-stagger-1">
        <p className="section-label mb-3">Profil</p>
        <div className="card-base space-y-4">
          <div>
            <label className="mb-2 block text-sm text-text-secondary">Taille (cm)</label>
            <input
              type="number"
              value={settings.height}
              onChange={(event) => updateSettings({ height: Number(event.target.value) || 0 })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-text-secondary">Poids cible</label>
            <input
              type="number"
              value={settings.targetWeight}
              onChange={(event) => updateSettings({ targetWeight: Number(event.target.value) || 0 })}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUnitChange('kg')}
              className={`press-button h-12 flex-1 rounded-xl text-base font-medium transition duration-200 ${
                settings.unit === 'kg' ? 'bg-white text-black shadow-sm' : 'bg-bg-elevated text-text-secondary'
              }`}
            >
              kg
            </button>
            <button
              type="button"
              onClick={() => onUnitChange('lbs')}
              className={`press-button h-12 flex-1 rounded-xl text-base font-medium transition duration-200 ${
                settings.unit === 'lbs' ? 'bg-white text-black shadow-sm' : 'bg-bg-elevated text-text-secondary'
              }`}
            >
              lbs
            </button>
          </div>
        </div>
      </div>

      <ChallengeCard entries={entriesApi.entries} settings={settings} updateSettings={updateSettings} />

      <div className="animate-fade-up animate-stagger-2">
        <p className="section-label mb-3">Plan de poids</p>
        <div className="card-base space-y-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Rythme et points de contrôle</p>
            <p className="mt-0.5 text-[13px] text-text-tertiary">
              {settings.weeklyPace != null
                ? `Rythme actuel : ${formatPace(settings.weeklyPace)}`
                : 'Aucun rythme défini'}
            </p>
          </div>
          <button
            type="button"
            onClick={onEditPlan}
            className="press-button h-12 w-full rounded-xl bg-[#A78BFA]/15 text-[15px] font-medium text-[#A78BFA]"
          >
            {settings.weeklyPace != null ? 'Ajuster le plan de poids' : 'Configurer le plan de poids'}
          </button>
        </div>
      </div>

      <div className="animate-fade-up animate-stagger-3">
        <p className="section-label mb-3">Rappels</p>
        <div className="card-base space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Activer les rappels</p>
              <p className="mt-0.5 text-[13px] text-text-tertiary">Notification quotidienne</p>
            </div>
            <IOSSwitch
              checked={settings.reminderEnabled}
              onChange={onReminderToggle}
              label="Activer les rappels"
            />
          </div>
          {settings.reminderEnabled ? (
            <div className="animate-fade-up">
              <label className="mb-2 block text-sm text-text-secondary">Heure du rappel</label>
              <input
                type="time"
                value={settings.reminderTime || '08:00'}
                onChange={(event) => updateSettings({ reminderTime: event.target.value || '08:00' })}
                className={inputClass}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="animate-fade-up animate-stagger-4">
        <p className="section-label mb-3">Données</p>
        <div className="card-base space-y-3">
          <ExportButton onExport={entriesApi.exportCSV} label="Exporter en CSV" />
          <ExportButton onExport={() => entriesApi.exportJSON(settings)} label="Exporter en JSON" />
          <label className="press-button flex h-12 cursor-pointer items-center rounded-xl bg-bg-elevated px-4 text-[15px] text-text-primary transition duration-200">
            Importer un fichier JSON
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
                  alert('Import terminé avec succès.')
                } catch {
                  alert('Fichier d\'import invalide.')
                }
              }}
            />
          </label>
        </div>
      </div>

      <div className="animate-fade-up animate-stagger-5">
        <p className="section-label mb-3">Zone de danger</p>
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm('Effacer toutes les données ? Cette action est irréversible.')) return

            try {
              await entriesApi.clearEntries()
              resetSettings()
            } catch {
              alert("Impossible d'effacer les données pour le moment.")
            }
          }}
          className="press-button h-12 w-full rounded-xl border border-accent-red text-base font-medium text-accent-red transition duration-200"
        >
          Effacer toutes les données
        </button>
      </div>
    </section>
  )
}

export default SettingsScreen
