import { useCallback, useMemo, useState } from 'react'
import GlassCard from '../ui/GlassCard'
import GlassButton from '../ui/GlassButton'
import MeasurementSheet from './MeasurementSheet'
import MeasurementsList from './MeasurementsList'
import usePendingDelete from '../../hooks/usePendingDelete'
import { useToast } from '../../hooks/useToast'
import { formatDateEntry } from '../../utils/locale'
import {
  MEASUREMENT_ZONES,
  formatCm,
  formatCmDelta,
  measurementProgress,
  seriesForZone,
} from '../../utils/measurements'

const UNDO_DELAY_MS = 5000

/** Mini-courbe SVG (≥ 2 points), couleur héritée (currentColor). */
function Sparkline({ points }) {
  const width = 96
  const height = 28
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * (width - 4) + 2
      const y = height - 3 - ((point.value - min) / span) * (height - 6)
      return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" className="shrink-0">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const deltaTone = (delta) => (delta == null ? 'text-text-secondary' : delta < 0 ? 'text-good-text' : delta > 0 ? 'text-danger-text' : 'text-text-secondary')

/** Section « Mensurations » (Progrès) : cumul depuis le départ, mini-courbes, relevés, saisie. */
function MeasurementsCard({ measurements, challengeStartDate, onSave, onDeleteMany }) {
  const { show, dismiss } = useToast()
  const [sheet, setSheet] = useState(null)
  const [showList, setShowList] = useState(false)
  const { pendingIds, schedule, undo } = usePendingDelete(onDeleteMany, UNDO_DELAY_MS, dismiss)

  const visible = useMemo(() => measurements.filter((record) => !pendingIds.has(record.id)), [measurements, pendingIds])
  const progress = useMemo(() => measurementProgress(visible, challengeStartDate), [visible, challengeStartDate])
  const latest = visible[visible.length - 1] ?? null
  const lastValues = useMemo(() => {
    const values = {}
    for (const record of visible) {
      for (const { key } of MEASUREMENT_ZONES) if (record[key] != null) values[key] = record[key]
    }
    return values
  }, [visible])

  const openAdd = useCallback(() => setSheet({ record: null }), [])
  const closeSheet = useCallback(() => setSheet(null), [])

  const handleDelete = useCallback(
    (record) => {
      schedule(record.id)
      show('Relevé supprimé', {
        duration: UNDO_DELAY_MS,
        action: { label: 'Annuler', onClick: () => undo(record.id) },
      })
    },
    [schedule, show, undo],
  )

  const zones = MEASUREMENT_ZONES.filter(({ key }) => progress.byZone[key])

  return (
    <GlassCard as="section" aria-labelledby="measurements-title" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="measurements-title" className="text-[15px] font-semibold text-text-primary">
            Mensurations
          </h3>
          <p className="mt-0.5 text-[12px] text-text-secondary">
            {latest ? `Dernier relevé : ${formatDateEntry(latest.date)}` : 'Taille, hanches, poitrine, bras, cuisse, cou'}
          </p>
        </div>
      </div>

      {progress.totalDelta != null ? (
        <p className="mt-3 text-[28px] font-bold tabular-nums tracking-[-0.02em]">
          <span className={deltaTone(progress.totalDelta)}>{formatCmDelta(progress.totalDelta)}</span>
          <span className="ml-2 text-[14px] font-medium tracking-normal text-text-secondary">depuis le départ</span>
        </p>
      ) : latest ? (
        <p className="mt-3 text-[13px] text-text-secondary">Ajoute un 2e relevé pour voir ton évolution.</p>
      ) : (
        <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
          Un relevé par semaine suffit : les centimètres bougent parfois quand la balance stagne.
        </p>
      )}

      {zones.length ? (
        <ul className="mt-4 grid grid-cols-1 gap-2" aria-label="Évolution par zone">
          {zones.map(({ key, label }) => {
            const zone = progress.byZone[key]
            const series = seriesForZone(visible, key)
            return (
              <li key={key} className="glass-sm flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text-secondary">{label}</p>
                  <p className="text-[15px] font-semibold tabular-nums text-text-primary">
                    {formatCm(zone.latest)}
                    {zone.delta != null ? (
                      <span className={`ml-2 text-[13px] font-medium ${deltaTone(zone.delta)}`}>{formatCmDelta(zone.delta)}</span>
                    ) : null}
                  </p>
                </div>
                {series.length >= 2 ? (
                  <span className="text-accent-text">
                    <Sparkline points={series} />
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <GlassButton onClick={openAdd} className="flex-1">
          Ajouter des mesures
        </GlassButton>
        {visible.length ? (
          <GlassButton variant="secondary" onClick={() => setShowList((value) => !value)} aria-expanded={showList}>
            {showList ? 'Masquer' : `Relevés (${visible.length})`}
          </GlassButton>
        ) : null}
      </div>

      {showList ? (
        <div className="mt-3">
          <MeasurementsList measurements={visible} onEdit={(record) => setSheet({ record })} onDelete={handleDelete} />
        </div>
      ) : null}

      <MeasurementSheet
        key={sheet ? `m-${sheet.record?.id ?? 'new'}` : 'm-closed'}
        open={Boolean(sheet)}
        record={sheet?.record ?? null}
        lastValues={lastValues}
        onSave={onSave}
        onClose={closeSheet}
      />
    </GlassCard>
  )
}

export default MeasurementsCard
