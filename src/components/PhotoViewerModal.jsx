import { useEffect, useState } from 'react'
import PhotoCropModal from './PhotoCropModal'
import usePhotoCrop from '../hooks/usePhotoCrop'
import { formatDateEntry } from '../utils/locale'
import { PHOTO_LIBRARY_ACCEPT } from '../utils/photo'

function PhotoViewerModal({
  isOpen,
  onClose,
  date,
  photoUrl,
  weight,
  unit = 'kg',
  onChangePhoto,
  onDeletePhoto,
  onCompare,
  canCompare = false,
  isSaving = false,
}) {
  const [render, setRender] = useState(false)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const { cropImageUrl, isCropOpen, closeCrop, handleFileSelect } = usePhotoCrop()

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
      const timer = setTimeout(() => setRender(false), 300)
      return () => clearTimeout(timer)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) closeCrop()
  }, [isOpen, closeCrop])

  if (!render) return null

  const handleCropConfirm = async (blob) => {
    closeCrop()
    setIsProcessingPhoto(true)
    setError('')

    try {
      await onChangePhoto(blob)
    } catch (changeError) {
      setError(changeError.message || 'Impossible de traiter la photo.')
    } finally {
      setIsProcessingPhoto(false)
    }
  }

  const handleDelete = async () => {
    try {
      await onDeletePhoto()
      onClose()
    } catch (deleteError) {
      setError(deleteError.message || 'Impossible de supprimer la photo.')
      setIsConfirmingDelete(false)
    }
  }

  const isBusy = isProcessingPhoto || isSaving || isCropOpen

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className={`absolute inset-0 bg-black/85 backdrop-blur-sm transition-opacity duration-300 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`relative w-full max-w-md rounded-t-[24px] border-t border-border bg-bg-card px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] transition-all duration-300 sm:rounded-[24px] sm:border ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-bg-elevated sm:hidden" aria-hidden="true" />

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] text-text-tertiary">{formatDateEntry(date)}</p>
              {weight != null ? (
                <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                  {weight.toString().replace('.', ',')} {unit}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="press-button rounded-full p-2 text-text-tertiary hover:text-text-secondary"
              aria-label="Fermer"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="relative mx-auto mt-5 aspect-[9/16] max-h-[60vh] overflow-hidden rounded-2xl border border-border bg-bg-elevated">
            {photoUrl ? (
              <img src={photoUrl} alt={`Photo du ${date}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-text-tertiary">Aucune photo</div>
            )}
            {isProcessingPhoto || isSaving ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            ) : null}
          </div>

          {error ? <p className="mt-3 text-sm text-accent-red">{error}</p> : null}

          {isConfirmingDelete ? (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-bg-elevated p-3 text-sm">
              <p className="text-text-secondary">Supprimer la photo du jour ?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="press-button rounded-lg bg-accent-red px-3 py-1.5 font-medium text-white"
                >
                  Oui
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="press-button rounded-lg px-3 py-1.5 text-text-secondary"
                >
                  Non
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 flex gap-2">
                <label
                  className={`btn-primary relative flex h-11 flex-1 cursor-pointer items-center justify-center text-[14px] ${
                    isBusy ? 'pointer-events-none opacity-40' : ''
                  }`}
                >
                  {photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
                  <input
                    type="file"
                    accept={PHOTO_LIBRARY_ACCEPT}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={handleFileSelect}
                    tabIndex={-1}
                    aria-label="Choisir une photo depuis la bibliothèque"
                  />
                </label>
                {photoUrl ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    disabled={isBusy}
                    className="press-button h-11 rounded-[14px] bg-accent-red/15 px-4 text-[14px] font-medium text-accent-red disabled:opacity-40"
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onCompare}
                disabled={!canCompare || isBusy}
                className="press-button mt-2 h-11 w-full rounded-[14px] bg-bg-elevated text-[14px] font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Comparer avant / après
              </button>
            </>
          )}
        </div>
      </div>
      <PhotoCropModal
        isOpen={isCropOpen}
        imageUrl={cropImageUrl}
        onClose={closeCrop}
        onConfirm={handleCropConfirm}
      />
    </>
  )
}

export default PhotoViewerModal
