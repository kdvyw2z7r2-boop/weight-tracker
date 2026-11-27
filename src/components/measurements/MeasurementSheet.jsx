import { useId, useMemo, useRef, useState } from 'react'
import GlassSheet from '../feature/GlassSheet'
import GlassButton from '../ui/GlassButton'
import { todayIso } from '../../utils/challenge'
import { CM_MAX, CM_MIN, MEASUREMENT_ZONES, formatCmValue } from '../../utils/measurements'
import { parseBoundedNumber, roundToDecimals } from '../../utils/number'

const initialDrafts = (record) =>
  Object.fromEntries(
    MEASUREMENT_ZONES.map(({ key }) => [key, record?.[key] != null ? formatCmValue(record[key]) : '']),
  )

/** État d'un champ : 'empty' | 'invalid' | nombre (cm, 1 décimale). */
function parseDraft(text) {
  if (!String(text ?? '').trim()) return 'empty'
  const value = parseBoundedNumber(text, { min: CM_MIN, max: CM_MAX })
  return value == null ? 'invalid' : roundToDecimals(value, 1)
}

/** Saisie d'un relevé : date + 6 zones optionnelles (au moins une), placeholder = dernière valeur. */
function MeasurementSheet({ open, record, lastValues, onSave, onClose }) {
  const [date, setDate] = useState(record?.date ?? todayIso())
  const [drafts, setDrafts] = useState(() => initialDrafts(record))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dateRef = useRef(null)
  const baseId = useId()

  const parsed = useMemo(
    () => Object.fromEntries(MEASUREMENT_ZONES.map(({ key }) => [key, parseDraft(drafts[key])])),
    [drafts],
  )
  const values = Object.values(parsed)
  const hasInvalid = values.includes('invalid')
  const filled = values.filter((value) => typeof value === 'number').length
  const canSave = Boolean(date) && filled > 0 && !hasInvalid && !saving

  const submit = async (event) => {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError('')
    const data = { date }
    if (record?.id) data.id = record.id
    for (const { key } of MEASUREMENT_ZONES) {
      if (typeof parsed[key] === 'number') data[key] = parsed[key]
    }
    try {
      await onSave(data)
      onClose()
    } catch {
      setError('Impossible d’enregistrer ces mesures.')
      setSaving(false)
    }
  }

  return (
    <GlassSheet
      open={open}
      title={record ? 'Modifier les mesures' : 'Ajouter des mesures'}
      subtitle="En centimètres · remplis seulement les zones mesurées."
      onClose={onClose}
      initialFocusRef={dateRef}
    >
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <div>
          <label htmlFor={`${baseId}-date`} className="mb-2 block text-sm text-text-secondary">
            Date
          </label>
          <input
            ref={dateRef}
            id={`${baseId}-date`}
            type="date"
            value={date}
            max={todayIso()}
            onChange={(event) => setDate(event.target.value)}
            className="glass-field h-12 w-full px-4 text-base"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MEASUREMENT_ZONES.map(({ key, label }) => {
            const id = `${baseId}-${key}`
            const invalid = parsed[key] === 'invalid'
            const placeholder = lastValues?.[key] != null ? formatCmValue(lastValues[key]) : '—'
            return (
              <div key={key}>
                <label htmlFor={id} className="mb-2 block text-sm text-text-secondary">
                  {label}
                </label>
                <div className="relative">
                  <input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={drafts[key]}
                    placeholder={placeholder}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? `${id}-err` : undefined}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                    className={`glass-field h-12 w-full pl-4 pr-11 text-base tabular-nums placeholder:text-text-tertiary/60 ${
                      invalid ? 'border-danger' : ''
                    }`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-text-secondary" aria-hidden="true">
                    cm
                  </span>
                </div>
                {invalid ? (
                  <p id={`${id}-err`} className="mt-1 text-[12px] text-danger-text">
                    Entre {CM_MIN} et {CM_MAX} cm
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
        {error ? (
          <p role="alert" className="text-[13px] text-danger-text">
            {error}
          </p>
        ) : null}
        <div className="space-y-2 pt-1">
          <GlassButton type="submit" size="lg" className="w-full" disabled={!canSave}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </GlassButton>
          <GlassButton variant="secondary" size="lg" className="w-full" onClick={onClose}>
            Annuler
          </GlassButton>
        </div>
      </form>
    </GlassSheet>
  )
}

export default MeasurementSheet
