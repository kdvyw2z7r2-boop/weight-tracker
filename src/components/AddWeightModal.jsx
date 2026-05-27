import { format } from 'date-fns'
import { useState } from 'react'

function AddWeightModal({ isOpen, onClose, onSave, initial = null }) {
  const [weight, setWeight] = useState(initial?.weight ?? '')
  const [date, setDate] = useState(initial?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    const parsedWeight = Number(weight)
    if (Number.isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
      setError('Le poids doit etre entre 30 et 300.')
      return
    }
    onSave({ weight: parsedWeight, date, note })
    setWeight('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setNote('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Ajouter une pesee</h2>
        <div className="space-y-3">
          <input
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Poids"
            className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-2"
            required
          />
          <input
            value={date}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            className="w-full rounded-xl border border-border bg-bg-elevated px-3 py-2"
            required
          />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 200))}
            placeholder="Note (optionnel)"
            className="h-24 w-full rounded-xl border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2">
            Annuler
          </button>
          <button type="submit" className="flex-1 rounded-xl bg-white py-2 font-medium text-black">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddWeightModal
