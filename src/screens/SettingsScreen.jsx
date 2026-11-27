import { useState } from 'react'
import ConfirmSheet from '../components/ConfirmSheet'
import ExportButton from '../components/ExportButton'
import NumberField from '../components/NumberField'
import GlassButton from '../components/ui/GlassButton'
import GlassCard from '../components/ui/GlassCard'
import SegmentedControl from '../components/ui/SegmentedControl'
import {
  buildChallengeResetPatch,
  buildChallengeRestorePatch,
  resolveChallengeStart,
  todayIso,
} from '../utils/challenge'
import { useToast } from '../hooks/useToast'
import { formatDateShort } from '../utils/locale'
import { formatPace, formatWeight, formatWeightWithUnit } from '../utils/format'

function IOSSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`press-button relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        checked ? 'border-transparent bg-accent' : 'border-white/30 bg-white/25'
      }`}
    >
      <span
        className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-md transition duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          checked ? 'translate-x-[21px]' : 'translate-x-px'
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

  const { show } = useToast()
  const [confirming, setConfirming] = useState(null)
  const restartLabel = date === today ? "aujourd'hui" : `le ${formatDateShort(date)}`

  const doRestart = async () => {
    setConfirming(null)
    try {
      await updateSettings(buildChallengeResetPatch(entries, date, settings))
    } catch {
      show('Impossible de redémarrer le défi pour le moment.', { tone: 'error' })
    }
  }

  const doRestoreOrigin = async () => {
    setConfirming(null)
    try {
      await updateSettings(buildChallengeRestorePatch(entries, settings))
    } catch {
      show('Impossible de reprendre le défi pour le moment.', { tone: 'error' })
    }
  }

  return (
    <div className="animate-fade-up animate-stagger-2">
      <p className="section-label mb-2 px-1">Défi</p>
      <GlassCard className="space-y-4 p-4">
        <div>
          <p className="text-[15px] font-medium text-text-primary">Point de départ</p>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {start
              ? `${formatDateShort(start.startDate)} · ${formatWeightWithUnit(start.startWeight, settings.unit)}`
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
            className="glass-field h-12 w-full px-4 text-base [color-scheme:dark]"
          />
        </div>
        <GlassButton
          variant="secondary"
          onClick={() => setConfirming('restart')}
          disabled={!entries.length}
          className="w-full"
        >
          Recommencer le défi à zéro
        </GlassButton>
        {isCustom ? (
          <button
            type="button"
            onClick={() => setConfirming('restore')}
            className="press-button min-h-11 w-full text-center text-[14px] font-medium text-accent underline-offset-2 hover:underline"
          >
            Reprendre depuis la première pesée
          </button>
        ) : null}
      </GlassCard>
      <ConfirmSheet
        open={confirming === 'restart'}
        title={`Recommencer le défi ${restartLabel} ?`}
        message="Le départ, la progression et le plan repartiront de cette date. Vos pesées et photos sont conservées dans l'historique."
        confirmLabel="Recommencer"
        tone="danger"
        onConfirm={doRestart}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmSheet
        open={confirming === 'restore'}
        title="Reprendre depuis la première pesée ?"
        message="Le point de départ redeviendra votre toute première pesée."
        confirmLabel="Reprendre"
        onConfirm={doRestoreOrigin}
        onCancel={() => setConfirming(null)}
      />
    </div>
  )
}

function SettingsScreen({ entriesApi, settings, updateSettings, onEditPlan }) {
  const { show } = useToast()
  const [isClearOpen, setIsClearOpen] = useState(false)

  const doClear = async () => {
    setIsClearOpen(false)
    try {
      await entriesApi.clearEntries()
    } catch {
      show("Impossible d'effacer les données pour le moment.", { tone: 'error' })
    }
  }

  const onUnitChange = async (nextUnit) => {
    if (nextUnit === settings.unit) return

    try {
      await entriesApi.convertAllUnits(nextUnit)
    } catch {
      show('Impossible de convertir les données pour le moment.', { tone: 'error' })
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

  const inputClass = 'glass-field h-12 w-full px-4 text-base [color-scheme:dark]'

  return (
    <section className="space-y-4">
      <div className="animate-fade-up">
        <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-text-primary">Réglages</h2>
        <p className="mt-0.5 text-[13px] font-medium text-text-secondary">Profil et préférences</p>
      </div>

      <div className="animate-fade-up animate-stagger-1">
        <p className="section-label mb-2 px-1">Profil</p>
        <GlassCard className="space-y-4 p-4">
          <NumberField
            label="Taille (cm)"
            value={settings.height}
            min={120}
            max={230}
            decimals={0}
            format={(v) => String(Math.round(Number(v)))}
            onCommit={(height) => updateSettings({ height })}
          />
          <NumberField
            label={`Poids cible (${settings.unit})`}
            value={settings.targetWeight}
            min={settings.unit === 'lbs' ? 66 : 30}
            max={settings.unit === 'lbs' ? 550 : 250}
            decimals={1}
            format={formatWeight}
            onCommit={(targetWeight) => updateSettings({ targetWeight })}
          />
          <SegmentedControl
            ariaLabel="Unité"
            value={settings.unit}
            onChange={onUnitChange}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lbs', label: 'lbs' },
            ]}
          />
        </GlassCard>
      </div>

      <ChallengeCard entries={entriesApi.entries} settings={settings} updateSettings={updateSettings} />

      <div className="animate-fade-up animate-stagger-2">
        <p className="section-label mb-2 px-1">Plan de poids</p>
        <GlassCard className="space-y-4 p-4">
          <div>
            <p className="text-[15px] font-medium text-text-primary">Rythme et points de contrôle</p>
            <p className="mt-0.5 text-[13px] text-text-secondary">
              {settings.weeklyPace != null
                ? `Rythme actuel : ${formatPace(settings.weeklyPace, settings.unit)}`
                : 'Aucun rythme défini'}
            </p>
          </div>
          <GlassButton variant="secondary" onClick={onEditPlan} className="w-full">
            {settings.weeklyPace != null ? 'Ajuster le plan de poids' : 'Configurer le plan de poids'}
          </GlassButton>
        </GlassCard>
      </div>

      <div className="animate-fade-up animate-stagger-3">
        <p className="section-label mb-2 px-1">Rappels</p>
        <GlassCard className="divide-y divide-white/10 px-4">
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-[15px] font-medium text-text-primary">Activer les rappels</p>
              <p className="mt-0.5 text-[13px] text-text-secondary">Notification quotidienne</p>
            </div>
            <IOSSwitch
              checked={settings.reminderEnabled}
              onChange={onReminderToggle}
              label="Activer les rappels"
            />
          </div>
          <p className="py-3.5 text-[13px] leading-relaxed text-text-secondary">
            {typeof Notification !== 'undefined' && Notification.permission === 'denied'
              ? "Notifications bloquées dans le navigateur : le rappel s'affichera dans l'app."
              : "Le rappel s'affiche à l'heure choisie si l'app est ouverte, ou dès que tu la rouvres. Installe l'app pour recevoir une notification."}
          </p>
          {settings.reminderEnabled ? (
            <div className="animate-fade-up py-3.5">
              <label htmlFor="reminder-time" className="mb-2 block text-sm text-text-secondary">
                Heure du rappel
              </label>
              <input
                id="reminder-time"
                type="time"
                value={settings.reminderTime || '08:00'}
                onChange={(event) => updateSettings({ reminderTime: event.target.value || '08:00' })}
                className={inputClass}
              />
            </div>
          ) : null}
        </GlassCard>
      </div>

      <div className="animate-fade-up animate-stagger-4">
        <p className="section-label mb-2 px-1">Données</p>
        <GlassCard className="divide-y divide-white/10 overflow-hidden">
          <ExportButton onExport={entriesApi.exportCSV} label="Exporter en CSV" />
          <ExportButton onExport={() => entriesApi.exportJSON(settings)} label="Exporter en JSON" />
          <label className="press-button flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-[15px] text-text-primary transition duration-200 focus-within:outline-2 focus-within:outline-accent">
            Importer un fichier JSON
            <span aria-hidden="true" className="text-[17px] text-text-secondary">
              ›
            </span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                try {
                  await entriesApi.importJSON(file)
                  show('Import terminé avec succès.', { tone: 'success' })
                } catch {
                  show("Fichier d'import invalide.", { tone: 'error' })
                }
              }}
            />
          </label>
        </GlassCard>
      </div>

      <div className="animate-fade-up animate-stagger-5">
        <p className="section-label mb-2 px-1">Zone de danger</p>
        <GlassButton variant="danger" size="lg" onClick={() => setIsClearOpen(true)} className="w-full">
          Effacer toutes les données
        </GlassButton>
        <ConfirmSheet
          open={isClearOpen}
          title="Effacer toutes les données ?"
          message="Cette action est irréversible."
          confirmLabel="Tout effacer"
          tone="danger"
          onConfirm={doClear}
          onCancel={() => setIsClearOpen(false)}
        />
      </div>
    </section>
  )
}

export default SettingsScreen
