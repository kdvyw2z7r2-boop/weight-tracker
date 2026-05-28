import { format } from 'date-fns'
import { useEffect, useState } from 'react'

function AddWeightModal({ isOpen, onClose, onSave, unit = 'kg', initial = null }) {
  const [weight, setWeight] = useState(initial?.weight ?? '')
  const [date, setDate] = useState(initial?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [render, setRender] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRender(true)
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      document.body.style.overflow = ''
      const timer = setTimeout(() => setRender(false), 380)
      return () => clearTimeout(timer)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!render) return null

  const handleClose = () => {
    if (!isSaving) onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const parsedWeight = Number(weight)
    if (Number.isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
      setError('Le poids doit être entre 30 et 300.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      await onSave({ weight: parsedWeight, date, note })
      setWeight('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setNote('')
      onClose()
    } catch {
      setError("Impossible d'enregistrer pour le moment. Réessaie dans quelques secondes.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={handleClose}
        className={`absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <form
        onSubmit={handleSubmit}
        className={`relative w-full max-w-md rounded-t-[24px] border-t border-border bg-bg-card px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-bg-elevated" aria-hidden="true" />
        <h2 className="text-center text-lg font-semibold">Nouvelle pesée</h2>

        <div className="mt-8">
          <input
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0,0"
            className="w-full border-b border-border bg-transparent py-2 text-center text-[48px] font-bold leading-none text-white outline-none transition-colors duration-200 placeholder:text-text-tertiary focus:border-white/30 disabled:opacity-60"
            required
            autoFocus
            disabled={isSaving}
          />
          <p className="mt-2 text-center text-[13px] text-text-tertiary">{unit}</p>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label className="section-label mb-2 block">Date</label>
            <input
              value={date}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              className="h-12 w-full rounded-xl border border-transparent bg-bg-elevated px-4 text-[15px] text-white outline-none transition duration-200 focus:border-white/20 disabled:opacity-60"
              required
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="section-label mb-2 block">Note</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 200))}
              placeholder="Ajouter une note (optionnel)"
              className="h-24 w-full resize-none rounded-xl border border-transparent bg-bg-elevated px-4 py-3 text-[15px] leading-relaxed text-white outline-none transition duration-200 placeholder:text-text-tertiary focus:border-white/20 disabled:opacity-60"
              disabled={isSaving}
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-accent-red">{error}</p> : null}

        <button
          type="submit"
          className="btn-primary mt-6 h-[52px] w-full rounded-[14px] text-base font-medium disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
        >
          {isSaving ? 'Synchronisation...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}

export default AddWeightModal
