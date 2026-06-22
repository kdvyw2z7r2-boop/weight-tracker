import { addDays, format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import BmiChart from '../components/BmiChart'
import HudHeader from '../components/HudHeader'
import MotivationBanner from '../components/MotivationBanner'
import PillSelector from '../components/PillSelector'
import StatOrb from '../components/StatOrb'
import useAnimatedNumber from '../hooks/useAnimatedNumber'
import { formatDatePlanShort } from '../utils/locale'
import { getMotivation } from '../utils/motivation'
import {
  BMI_GAUGE_MAX,
  BMI_ZONES,
  getBmi,
  getBmiCategory,
  getBmiHistory,
  getBmiMarkerPercent,
  getBmiMovingAverage,
  getBmiStats,
  getBmiZoneWidths,
  getCurrentStreak,
} from '../utils/stats'
import {
  computeActualRates,
  computeWeightPlan,
  formatPace,
  formatWeight,
  getNextCheckpoint,
  resolvePlanAnchor,
} from '../utils/weightPlan'

const PERIODS = [
  { key: '1m', label: '1 mois', days: 30 },
  { key: '3m', label: '3 mois', days: 90 },
  { key: '6m', label: '6 mois', days: 180 },
  { key: 'all', label: 'Tout', days: null },
]

function formatBmi(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(1).replace('.', ',')
}

function DistributionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="text-[12px] text-text-tertiary">{payload[0]?.payload?.range} {payload[0]?.payload?.unit}</p>
      <p className="text-sm font-semibold text-white">{payload[0]?.value} pesée(s)</p>
    </div>
  )
}

function ProgressScreen({ entries, settings, onEditPlan }) {
  const [period, setPeriod] = useState('all')

  const filteredEntries = useMemo(() => {
    const selected = PERIODS.find((item) => item.key === period)
    if (!selected || selected.days === null) return entries
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - selected.days)
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    return entries.filter((entry) => entry.date >= cutoffIso)
  }, [entries, period])

  const weights = filteredEntries.map((entry) => entry.weight)
  const currentWeight = filteredEntries[0]?.weight ?? 0
  const minWeight = weights.length ? Math.min(...weights) : 0
  const maxWeight = weights.length ? Math.max(...weights) : 0
  const avgWeight = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0

  const last30 = [...filteredEntries].slice(0, 30)
  const oldest = last30.at(-1)
  const dailyRate = oldest ? (currentWeight - oldest.weight) / Math.max(1, last30.length - 1) : 0
  const daysLeft = dailyRate !== 0 ? Math.abs((currentWeight - settings.targetWeight) / dailyRate) : null
  const projectedDate = daysLeft ? format(addDays(new Date(), Math.ceil(daysLeft)), 'dd/MM/yyyy') : null

  const latestBmi = getBmi(entries[0]?.weight, settings.height, settings.unit)
  const bmiRounded = latestBmi != null ? Number(latestBmi.toFixed(1)) : null
  const bmiCategory = getBmiCategory(bmiRounded)
  const animatedBmi = useAnimatedNumber(bmiRounded ?? 0, 800)
  const markerPercent = getBmiMarkerPercent(bmiRounded, BMI_GAUGE_MAX)
  const bmiZoneWidths = getBmiZoneWidths(BMI_GAUGE_MAX)
  const streak = getCurrentStreak(entries)

  const bmiHistory = useMemo(
    () => getBmiHistory(filteredEntries, settings.height, settings.unit),
    [filteredEntries, settings.height, settings.unit],
  )
  const bmiMovingAverage = useMemo(() => getBmiMovingAverage(bmiHistory, 7), [bmiHistory])
  const bmiStats = useMemo(
    () => getBmiStats(filteredEntries, settings.height, settings.unit),
    [filteredEntries, settings.height, settings.unit],
  )

  const bmiDeltaLabel =
    bmiStats.delta == null ? '—' : `${bmiStats.delta > 0 ? '+' : ''}${formatBmi(bmiStats.delta)}`

  const weightSpark = useMemo(
    () => [...filteredEntries].reverse().slice(-14).map((e) => e.weight),
    [filteredEntries],
  )

  const distribution = useMemo(
    () =>
      Object.entries(
        filteredEntries.reduce((acc, entry) => {
          const bucket = `${Math.floor(entry.weight)}-${Math.floor(entry.weight) + 1}`
          acc[bucket] = (acc[bucket] ?? 0) + 1
          return acc
        }, {}),
      ).map(([range, count]) => ({ range, count, unit: settings.unit })),
    [filteredEntries, settings.unit],
  )

  const anchor = resolvePlanAnchor(settings, entries)
  const plan = useMemo(() => {
    if (!settings.weeklyPace || !anchor?.startWeight || !anchor?.startDate) return null
    return computeWeightPlan({
      startWeight: anchor.startWeight,
      targetWeight: settings.targetWeight,
      weeklyPace: settings.weeklyPace,
      startDate: anchor.startDate,
    })
  }, [settings.weeklyPace, settings.targetWeight, settings.planStartDate, settings.planStartWeight, anchor?.startWeight, anchor?.startDate])

  const nextCheckpoint = getNextCheckpoint(plan)
  const { currentRate } = computeActualRates(entries, anchor?.startDate)

  const delta = entries[1] ? entries[0].weight - entries[1].weight : null
  const motivation = useMemo(
    () =>
      getMotivation({
        entriesCount: entries.length,
        streak,
        delta,
        monthVariation: bmiStats.delta,
      }),
    [entries.length, streak, delta, bmiStats.delta],
  )

  return (
    <section className="space-y-4">
      <HudHeader title="Analytics" subtitle="Progrès & données" badge={<span className="data-badge">Analyse</span>} />

      <MotivationBanner {...motivation} delay={1} />

      <div className="animate-fade-up animate-stagger-2">
        <PillSelector options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <div className="stats-grid animate-fade-up animate-stagger-3">
        <StatOrb label="Pesées" value={String(filteredEntries.length)} sublabel="Sur la période" accent="cyan" delay={3} />
        <StatOrb
          label="Moyenne"
          value={weights.length ? avgWeight.toFixed(1).replace('.', ',') : '—'}
          unit={settings.unit}
          sublabel="Poids moyen"
          accent="white"
          sparkData={weightSpark}
          delay={4}
        />
        <StatOrb
          label="Minimum"
          value={weights.length ? minWeight.toFixed(1).replace('.', ',') : '—'}
          unit={settings.unit}
          sublabel="Record bas"
          accent="green"
          delay={5}
        />
        <StatOrb
          label="Maximum"
          value={weights.length ? maxWeight.toFixed(1).replace('.', ',') : '—'}
          unit={settings.unit}
          sublabel="Record haut"
          accent="red"
          delay={6}
        />
      </div>

      {/* BMI HUD */}
      <div className="hud-card card-glow animate-fade-up animate-stagger-4 p-5">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <p className="section-label">Indice IMC</p>
            <span className={`text-[12px] font-bold uppercase tracking-wider ${bmiCategory.colorClass}`}>
              {bmiCategory.label}
            </span>
          </div>
          <div className="flex items-end gap-3 mt-2">
            <p className="hero-hud-weight !text-[56px] tabular-nums">
              {bmiRounded !== null ? animatedBmi.toFixed(1).replace('.', ',') : '—'}
            </p>
          </div>

          <div className="relative mt-5 pt-4">
            {bmiRounded !== null ? (
              <div
                className="absolute top-0 -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ left: `${markerPercent}%` }}
                aria-hidden="true"
              >
                <div className="h-0 w-0 border-x-[7px] border-b-[9px] border-x-transparent border-b-white drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
              </div>
            ) : null}
            <div className="flex h-3 overflow-hidden rounded-full">
              {bmiZoneWidths.map((zone) => (
                <div
                  key={zone.label}
                  className="h-full"
                  style={{ width: `${zone.widthPercent}%`, backgroundColor: zone.color, opacity: 0.85 }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[9px] font-medium uppercase tracking-wider text-text-tertiary">
              {BMI_ZONES.map((zone) => (
                <span key={zone.label}>{zone.label}</span>
              ))}
            </div>
          </div>

          {settings.height > 0 && bmiStats.count > 0 ? (
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
              <div className="text-center">
                <p className="font-display text-lg font-bold text-white">{formatBmi(bmiStats.min)}</p>
                <p className="text-[9px] uppercase tracking-wider text-text-tertiary">Min</p>
              </div>
              <div className="text-center">
                <p className="font-display text-lg font-bold neon-text-cyan">{formatBmi(bmiStats.avg)}</p>
                <p className="text-[9px] uppercase tracking-wider text-text-tertiary">Moy.</p>
              </div>
              <div className="text-center">
                <p className={`font-display text-lg font-bold ${bmiStats.delta != null && bmiStats.delta <= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                  {bmiDeltaLabel}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-text-tertiary">Évol.</p>
              </div>
            </div>
          ) : settings.height <= 0 ? (
            <p className="mt-4 text-[13px] text-text-tertiary">
              Renseignez votre taille dans les paramètres pour activer le suivi IMC.
            </p>
          ) : null}
        </div>
      </div>

      {settings.height > 0 ? (
        <div className="chart-card animate-fade-up animate-stagger-5">
          <div className="chart-card-header">
            <div>
              <p className="section-label">Évolution IMC</p>
              <p className="mt-1 text-[12px] text-text-tertiary">Courbe + moyenne 7j</p>
            </div>
            <span className="data-badge data-badge-live">Live</span>
          </div>
          <BmiChart data={bmiHistory} movingAverage={bmiMovingAverage} />
        </div>
      ) : null}

      {distribution.length > 0 ? (
        <div className="chart-card animate-fade-up animate-stagger-5 h-72">
          <div className="chart-card-header">
            <p className="section-label">Répartition des poids</p>
            <span className="data-badge">Histogramme</span>
          </div>
          <ResponsiveContainer width="100%" height="75%">
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" vertical={false} />
              <XAxis dataKey="range" stroke="#4B5563" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#4B5563" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<DistributionTooltip />} cursor={{ fill: 'rgba(0,229,255,0.08)' }} />
              <Bar
                dataKey="count"
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
                animationDuration={700}
              />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#bf00ff" stopOpacity="0.4" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {plan ? (
        <div className="animate-fade-up animate-stagger-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-label">Plan de poids</p>
            <button type="button" onClick={onEditPlan} className="press-button text-[12px] neon-text-cyan font-bold">
              Modifier
            </button>
          </div>

          <div className="hud-card space-y-0 p-0 overflow-hidden">
            <div className="relative z-10 flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-[14px] font-medium text-white">Rythme cible</p>
                <p className="text-[12px] text-text-tertiary mt-0.5">
                  {currentRate != null && currentRate > 0 ? `Actuel : ${formatPace(currentRate)}` : 'En attente de données'}
                </p>
              </div>
              <p className="font-display text-[16px] font-black neon-text-purple">{formatPace(plan.weeklyPace)}</p>
            </div>

            {nextCheckpoint ? (
              <div className="relative z-10 flex items-center justify-between border-t border-border px-4 py-4">
                <div>
                  <p className="text-[14px] font-medium text-white">Prochain palier</p>
                  <p className="text-[12px] text-text-tertiary mt-0.5">{formatDatePlanShort(nextCheckpoint.date)}</p>
                </div>
                <p className="font-display text-[16px] font-black tabular-nums text-white">
                  {formatWeight(nextCheckpoint.weight, settings.unit)} {settings.unit}
                </p>
              </div>
            ) : null}

            <div className="relative z-10 flex items-center justify-between border-t border-border px-4 py-4">
              <div>
                <p className="text-[14px] font-medium text-white">Objectif final</p>
                <p className="text-[12px] neon-text-amber mt-0.5">{formatDatePlanShort(plan.endDate)}</p>
              </div>
              <p className="font-display text-[16px] font-bold tabular-nums neon-text-amber">
                {formatWeight(plan.targetWeight, settings.unit)} {settings.unit}
              </p>
            </div>
          </div>
        </div>
      ) : entries.length > 0 ? (
        <div className="hud-card animate-fade-up animate-stagger-6 flex flex-col items-center py-8 text-center">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-white">Plan non configuré</p>
          <p className="mt-1.5 text-[13px] text-text-tertiary">Définissez un rythme pour débloquer les jalons.</p>
          {projectedDate ? (
            <p className="mt-3 text-[13px] text-text-secondary">
              Projection : <span className="font-medium neon-text-cyan">{projectedDate}</span>
            </p>
          ) : null}
          <button type="button" onClick={onEditPlan} className="btn-primary mt-5 h-11 px-6 text-[14px]">
            Créer un plan
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default ProgressScreen
