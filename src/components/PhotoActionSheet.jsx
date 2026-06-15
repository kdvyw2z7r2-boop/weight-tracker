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
  const { cropImageUrl, isCropOpen, closeCrop, handleFileSelect } = usePhotoCrop()

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
    if (!isOpen) closeCrop()
  }, [isOpen, closeCrop])

  if (!render) return null

  const isBusy = isProcessingPhoto || isSaving || isCropOpen

  const handleCropConfirm = async (blob) => {
    closeCrop()
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

          <div className="mt-5 space-y-2">
            <label
              className={`btn-primary relative flex h-12 w-full cursor-pointer items-center justify-center text-[15px] ${
                isBusy ? 'pointer-events-none opacity-40' : ''
              }`}
            >
              {isProcessingPhoto ? 'Enregistrement…' : hasPhoto ? 'Remplacer la photo' : 'Uploader une photo'}
              <input
                type="file"
                accept={PHOTO_LIBRARY_ACCEPT}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={handleFileSelect}
                tabIndex={-1}
                aria-label={
                  hasPhoto ? 'Remplacer la photo depuis la bibliothèque' : 'Uploader une photo depuis la bibliothèque'
                }
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

          {error ? <p className="mt-3 text-sm text-accent-red">{error}</p> : null}
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

export default PhotoActionSheet
