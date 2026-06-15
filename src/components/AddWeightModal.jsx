import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { processPhotoFile } from '../utils/photo'

function CameraIcon({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M4 8h3l1.5-2h7L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function AddWeightModal({
  isOpen,
  onClose,
  onSave,
  unit = 'kg',
  initial = null,
  getPhotoForDate = null,
  isSaving = false,
  isSupabaseConfigured = false,
}) {
  const [weight, setWeight] = useState(initial?.weight ?? '')
  const [date, setDate] = useState(initial?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')
  const [render, setRender] = useState(false)
  const [visible, setVisible] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoBlob, setPhotoBlob] = useState(null)
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const fileInputRef = useRef(null)
  const previousDateRef = useRef(date)

  const existingPhotoUrl = getPhotoForDate?.(date)?.url ?? null
  const hasExistingPhoto = Boolean(existingPhotoUrl)
  const photoRequired = isSupabaseConfigured
  const hasPhoto = Boolean(photoPreview || hasExistingPhoto)
  const canSubmit = (!photoRequired || hasPhoto) && !isProcessingPhoto && !isSaving

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- modal mount animation
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

  useEffect(() => {
    if (previousDateRef.current === date) return
    previousDateRef.current = date
    setPhotoPreview((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current)
      }
      return null
    })
    setPhotoBlob(null)
  }, [date])

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  if (!render) return null

  const handleClose = () => {
    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoPreview(null)
    setPhotoBlob(null)
    setError('')
    onClose()
  }

  const handlePhotoCapture = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsProcessingPhoto(true)
    setError('')

    try {
      const blob = await processPhotoFile(file)
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview)
      }
      setPhotoBlob(blob)
      setPhotoPreview(URL.createObjectURL(blob))
    } catch (captureError) {
      setError(captureError.message || 'Impossible de traiter la photo.')
    } finally {
      setIsProcessingPhoto(false)
    }
  }

  const handleRemovePhoto = () => {
    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoPreview(null)
    setPhotoBlob(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const parsedWeight = Number(weight)
    if (Number.isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
      setError('Le poids doit être entre 30 et 300.')
      return
    }

    if (photoRequired && !hasPhoto) {
      setError('Une photo est obligatoire pour enregistrer la pesée.')
      return
    }

    try {
      await onSave({
        weight: parsedWeight,
        date,
        note,
        photoBlob,
      })
      setWeight('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setNote('')
      setPhotoPreview(null)
      setPhotoBlob(null)
      setError('')
      onClose()
    } catch (saveError) {
      setError(saveError.message || 'Impossible d’enregistrer la pesée.')
    }
  }

  const displayPreview = photoPreview || existingPhotoUrl

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

        <div className="mt-6">
          <p className="section-label mb-3 text-center">Photo du jour</p>
          {!isSupabaseConfigured ? (
            <p className="mb-3 text-center text-[12px] leading-relaxed text-text-tertiary">
              Supabase requis pour les photos. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.
            </p>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handlePhotoCapture}
          />

          {displayPreview ? (
            <div className="mx-auto w-[180px]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-bg-elevated">
                <img src={displayPreview} alt="Aperçu photo" className="h-full w-full object-cover" />
                {isProcessingPhoto ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="press-button flex-1 rounded-xl bg-bg-elevated py-2.5 text-[13px] font-medium text-text-secondary"
                >
                  {hasExistingPhoto && !photoBlob ? 'Reprendre' : 'Changer'}
                </button>
                {photoBlob ? (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="press-button rounded-xl bg-accent-red/15 px-4 py-2.5 text-[13px] font-medium text-accent-red"
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
              {hasExistingPhoto && !photoBlob ? (
                <p className="mt-2 text-center text-[12px] text-text-tertiary">
                  Photo du jour déjà enregistrée — reprenez pour la remplacer.
                </p>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="press-button mx-auto flex aspect-[9/16] w-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-bg-elevated text-text-tertiary transition hover:border-white/25 hover:text-text-secondary"
            >
              <CameraIcon className="h-8 w-8" />
              <span className="text-[13px] font-medium">Prendre une photo</span>
            </button>
          )}
        </div>

        <div className="mt-8">
          <input
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0,0"
            className="w-full border-b border-border bg-transparent py-2 text-center text-[48px] font-bold leading-none text-white outline-none transition-colors duration-200 placeholder:text-text-tertiary focus:border-white/30"
            required
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
              className="h-12 w-full rounded-xl border border-transparent bg-bg-elevated px-4 text-[15px] text-white outline-none transition duration-200 focus:border-white/20"
              required
            />
          </div>
          <div>
            <label className="section-label mb-2 block">Note</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 200))}
              placeholder="Ajouter une note (optionnel)"
              className="h-24 w-full resize-none rounded-xl border border-transparent bg-bg-elevated px-4 py-3 text-[15px] leading-relaxed text-white outline-none transition duration-200 placeholder:text-text-tertiary focus:border-white/20"
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-accent-red">{error}</p> : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary mt-6 h-[52px] w-full rounded-[14px] text-base font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}

export default AddWeightModal
