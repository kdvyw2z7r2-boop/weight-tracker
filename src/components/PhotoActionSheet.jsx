import { useEffect, useState } from 'react'
import PhotoCropModal from './PhotoCropModal'
import usePhotoCrop from '../hooks/usePhotoCrop'
import { formatDateEntry } from '../utils/locale'
import { PHOTO_LIBRARY_ACCEPT } from '../utils/photo'

function PhotoActionSheet({
  isOpen,
  onClose,
  date,
  weight,
  unit = 'kg',
  hasPhoto = false,
  canCompare = false,
  onUpload,
  onView,
  onCompare,
  isSaving = false,
}) {
  const [render, setRender] = useState(false)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const {
    pendingImageUrl,
    hasPendingImage,
    isCropOpen,
    handleFileSelect,
    openCrop,
    closeCrop,
    clearPending,
  } = usePhotoCrop()

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- modal mount animation
      setRender(true)
      setError('')
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      document.body.style.overflow = ''
      const timer = setTimeout(() => setRender(false), 300)
      return () => clearTimeout(timer)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) clearPending()
  }, [isOpen, clearPending])

  if (!render) return null

  const isBusy = isProcessingPhoto || isSaving || isCropOpen

  const handleCropConfirm = async (blob) => {
    closeCrop()
    clearPending()
    setIsProcessingPhoto(true)
    setError('')

    try {
      await onUpload(blob)
      onView()
    } catch (uploadError) {
      setError(uploadError.message || 'Impossible de traiter la photo.')
    } finally {
      setIsProcessingPhoto(false)
    }
  }

  return (
    <>
      {!isCropOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className={`absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            className={`relative w-full max-w-md rounded-t-[24px] border-t border-border bg-bg-card px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] transition-all duration-300 sm:rounded-[24px] sm:border ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-bg-elevated sm:hidden" aria-hidden="true" />

            <div>
              <p className="text-[13px] text-text-tertiary">{formatDateEntry(date)}</p>
              {weight != null ? (
                <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                  {weight.toString().replace('.', ',')} {unit}
                </p>
              ) : null}
            </div>

            {hasPendingImage ? (
              <div className="mt-5 space-y-3">
                <div className="mx-auto aspect-[9/16] max-h-[40vh] w-full max-w-[180px] overflow-hidden rounded-2xl border border-border bg-bg-elevated">
                  <img src={pendingImageUrl} alt="Aperçu" className="h-full w-full object-contain" />
                </div>
                <p className="text-center text-[13px] text-text-tertiary">
                  Ajustez le cadrage avant d&apos;enregistrer
                </p>
                <button
                  type="button"
                  onClick={openCrop}
                  disabled={isBusy}
                  className="btn-primary h-12 w-full text-[15px] disabled:opacity-40"
                >
                  Recadrer
                </button>
                <label
                  className={`press-button relative flex h-11 w-full cursor-pointer items-center justify-center rounded-[14px] bg-bg-elevated text-[14px] font-medium text-text-secondary ${
                    isBusy ? 'pointer-events-none opacity-40' : ''
                  }`}
                >
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
                  disabled={isBusy}
                  className="press-button h-11 w-full rounded-[14px] text-[14px] font-medium text-text-secondary disabled:opacity-40"
                >
                  Annuler la sélection
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                <label
                  className={`btn-primary relative flex h-12 w-full cursor-pointer items-center justify-center text-[15px] ${
                    isBusy ? 'pointer-events-none opacity-40' : ''
                  }`}
                >
                  {isProcessingPhoto ? 'Enregistrement…' : hasPhoto ? 'Remplacer la photo' : 'Choisir une photo'}
                  <input
                    type="file"
                    accept={PHOTO_LIBRARY_ACCEPT}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={handleFileSelect}
                    tabIndex={-1}
                    aria-label="Choisir une photo depuis la bibliothèque"
                  />
                </label>
                <button
                  type="button"
                  onClick={onView}
                  disabled={!hasPhoto || isBusy}
                  className="press-button h-12 w-full rounded-[14px] bg-bg-elevated text-[15px] font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Visionner
                </button>
                <button
                  type="button"
                  onClick={onCompare}
                  disabled={!canCompare || isBusy}
                  className="press-button h-12 w-full rounded-[14px] bg-bg-elevated text-[15px] font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Comparer avant / après
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isBusy}
                  className="press-button h-12 w-full rounded-[14px] text-[15px] font-medium text-text-secondary disabled:opacity-40"
                >
                  Annuler
                </button>
              </div>
            )}

            {error ? <p className="mt-3 text-sm text-accent-red">{error}</p> : null}
          </div>
        </div>
      ) : null}
      <PhotoCropModal
        isOpen={isCropOpen}
        imageUrl={pendingImageUrl}
        onClose={closeCrop}
        onConfirm={handleCropConfirm}
      />
    </>
  )
}

export default PhotoActionSheet
