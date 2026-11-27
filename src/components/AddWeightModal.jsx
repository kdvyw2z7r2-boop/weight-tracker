import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import GlassButton from './ui/GlassButton'
import PhotoCropModal from './PhotoCropModal'
import usePhotoCrop from '../hooks/usePhotoCrop'
import { PHOTO_LIBRARY_ACCEPT } from '../utils/photo'

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
  getGhostUrl = null,
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
  const previousDateRef = useRef(date)
  const {
    pendingImageUrl,
    hasPendingImage,
    isCropOpen,
    handleFileSelect,
    openCrop,
    closeCrop,
    clearPending,
  } = usePhotoCrop()

  const existingPhotoUrl = getPhotoForDate?.(date)?.url ?? null
  const hasExistingPhoto = Boolean(existingPhotoUrl)
  const canSubmit = !hasPendingImage && !isCropOpen && !isSaving

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
    clearPending()
    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoPreview(null)
    setPhotoBlob(null)
    setError('')
    onClose()
  }

  const applyPhotoBlob = (blob) => {
    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoBlob(blob)
    setPhotoPreview(URL.createObjectURL(blob))
  }

  const handleCropConfirm = async (blob) => {
    closeCrop()
    clearPending()
    applyPhotoBlob(blob)
  }

  const handleRemovePhoto = () => {
    clearPending()
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

    try {
      await onSave({ weight: parsedWeight, date, note }, photoBlob)
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
    <>
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={handleClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <form
        onSubmit={handleSubmit}
        className={`glass-strong relative max-h-[94dvh] w-full max-w-md overflow-y-auto !rounded-b-none px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/30" aria-hidden="true" />
        <h2 className="text-center text-[17px] font-semibold text-text-primary">Nouvelle pesée</h2>

        <div className="mt-6">
          <p className="section-label mb-3 text-center">Photo du jour (optionnelle)</p>
          {!isSupabaseConfigured ? (
            <p className="mb-3 text-center text-[12px] leading-relaxed text-text-secondary">
              Photos indisponibles hors connexion au cloud.
            </p>
          ) : null}
          {hasPendingImage ? (
            <div className="mx-auto w-[180px] space-y-3">
              <div className="relative aspect-[9/16] overflow-hidden glass-sm bg-white/5">
                <img src={pendingImageUrl} alt="Aperçu photo" className="h-full w-full object-contain" />
              </div>
              <p className="text-center text-[12px] text-text-secondary">
                Ajustez le cadrage avant d&apos;enregistrer
              </p>
              <GlassButton onClick={openCrop} className="w-full">
                Recadrer
              </GlassButton>
              <label className="press-button glass-pill relative flex h-11 w-full cursor-pointer items-center justify-center text-[14px] font-semibold text-text-primary">
                Changer de photo
                <input
                  type="file"
                  accept={PHOTO_LIBRARY_ACCEPT}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handleFileSelect}
                  tabIndex={-1}
                  aria-label="Changer de photo"
                />
              </label>
              <button
                type="button"
                onClick={clearPending}
                className="press-button h-11 w-full rounded-full text-[14px] font-semibold text-text-secondary"
              >
                Annuler
              </button>
            </div>
          ) : displayPreview ? (
            <div className="mx-auto w-[180px]">
              <div className="relative aspect-[9/16] overflow-hidden glass-sm bg-white/5">
                <img src={displayPreview} alt="Aperçu photo" className="h-full w-full object-cover" />
              </div>
              <div className="mt-3 flex gap-2">
                <label className="press-button glass-pill relative flex h-11 flex-1 cursor-pointer items-center justify-center text-[14px] font-semibold text-text-primary">
                  Changer
                  <input
                    type="file"
                    accept={PHOTO_LIBRARY_ACCEPT}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={handleFileSelect}
                    tabIndex={-1}
                    aria-label="Choisir une photo depuis la bibliothèque"
                  />
                </label>
                {photoBlob ? (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="press-button btn-glass-danger h-11 px-4 text-[14px]"
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
              {hasExistingPhoto && !photoBlob ? (
                <p className="mt-2 text-center text-[12px] text-text-secondary">
                  Photo du jour déjà enregistrée — reprenez pour la remplacer.
                </p>
              ) : null}
            </div>
          ) : (
            <label className="press-button relative mx-auto flex aspect-[9/16] w-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-white/25 bg-white/5 text-text-secondary">
              <CameraIcon className="h-8 w-8" />
              <span className="text-[13px] font-medium">Choisir une photo</span>
              <input
                type="file"
                accept={PHOTO_LIBRARY_ACCEPT}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={handleFileSelect}
                tabIndex={-1}
                aria-label="Choisir une photo depuis la bibliothèque"
              />
            </label>
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
            className="w-full border-b border-white/20 bg-transparent py-2 text-center text-[64px] font-extralight leading-none tracking-[-0.04em] tabular-nums text-text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none transition-colors duration-200 placeholder:text-text-secondary focus:border-accent"
            required
          />
          <p className="mt-2 text-center text-[15px] font-medium text-text-secondary">{unit}</p>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label className="section-label mb-2 block">Date</label>
            <input
              value={date}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              className="glass-field h-12 w-full px-4 text-[15px]"
              required
            />
          </div>
          <div>
            <label className="section-label mb-2 block">Note</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 200))}
              placeholder="Ajouter une note (optionnel)"
              className="glass-field h-24 w-full resize-none px-4 py-3 text-[15px] leading-relaxed placeholder:text-text-secondary"
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <GlassButton type="submit" size="lg" disabled={!canSubmit} className="mt-6 w-full disabled:cursor-not-allowed disabled:opacity-40">
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </GlassButton>
      </form>
    </div>
      <PhotoCropModal
        isOpen={isCropOpen}
        imageUrl={pendingImageUrl}
        ghostUrl={getGhostUrl?.(date) ?? null}
        onClose={closeCrop}
        onConfirm={handleCropConfirm}
      />
    </>
  )
}

export default AddWeightModal
