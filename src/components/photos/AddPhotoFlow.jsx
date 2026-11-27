import { useEffect, useId, useRef } from 'react'
import PhotoCropModal from '../PhotoCropModal'
import useDialogBasics from '../../hooks/useDialogBasics'
import usePhotoCrop from '../../hooks/usePhotoCrop'
import { useToast } from '../../hooks/useToast'
import { PHOTO_LIBRARY_ACCEPT } from '../../utils/photo'
import { ghostFor } from '../../utils/progressPhotos'

// Boutons non vitrés : pas de verre imbriqué dans la feuille .glass-strong.
const SOURCE_CLASS =
  'press-button h-12 w-full rounded-full border border-white/15 bg-white/8 text-[15px] font-semibold text-text-primary'

/**
 * Ajout guidé : source (appareil photo / bibliothèque) -> cadrage 9:16 avec calque fantôme -> envoi.
 * Avec `recropUrl`, saute le choix de source et recadre cette photo existante.
 * Monté uniquement ouvert : l'état repart de zéro à chaque ouverture.
 */
function AddPhotoFlow({ open, ...props }) {
  if (!open) return null
  return <AddPhotoSession {...props} />
}

function AddPhotoSession({ date, photos, recropUrl = null, onUpload, onRefreshUrls, onClose, onSaved }) {
  const cameraRef = useRef(null)
  const libraryRef = useRef(null)
  const { show } = useToast()
  const { pendingImageUrl, isCropOpen, handleFileSelect, openCrop, openCropFromUrl } = usePhotoCrop()
  const sheetRef = useRef(null)
  const titleId = useId()
  const sourceOpen = !recropUrl && !isCropOpen
  useDialogBasics({ open: sourceOpen, onClose, containerRef: sheetRef })

  useEffect(() => {
    if (!recropUrl) return
    // URL expirée : re-signature puis une nouvelle tentative.
    const onExpired = onRefreshUrls ? async () => (await onRefreshUrls())[date]?.url ?? null : undefined
    openCropFromUrl(recropUrl, { onExpired }).catch((error) => {
      show(error.message || 'Impossible de charger la photo.', { tone: 'error' })
      onClose()
    })
    // Une seule fois, à l'ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recadrage d'une photo existante : on ne se prend pas elle-même pour guide.
  const guidePhotos = recropUrl ? photos.filter((photo) => photo.date !== date) : photos
  const ghostUrl = ghostFor(guidePhotos, date)?.url ?? null

  const handleChange = (event) => {
    if (!event.target.files?.length) return
    handleFileSelect(event)
    openCrop()
  }

  const handleConfirm = async (blob) => {
    try {
      await onUpload(date, blob)
    } catch (error) {
      show(error.message || 'Impossible d’enregistrer la photo.', { tone: 'error' })
      throw error
    }
    show('Photo enregistrée', { tone: 'success' })
    onSaved?.(date)
    onClose()
  }

  return (
    <>
      {sourceOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer"
            onClick={onClose}
            className="animate-modal-overlay absolute inset-0 bg-black/60"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="glass-strong animate-modal-sheet relative w-full max-w-md !rounded-b-none px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 sm:!rounded-b-[28px]"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />
            <h2 id={titleId} className="text-center text-[17px] font-semibold text-text-primary">
              Ajouter une photo
            </h2>
            <div className="mt-5 space-y-2">
              <button type="button" onClick={() => cameraRef.current?.click()} className={SOURCE_CLASS}>
                Appareil photo
              </button>
              <button type="button" onClick={() => libraryRef.current?.click()} className={SOURCE_CLASS}>
                Bibliothèque
              </button>
              <button
                type="button"
                onClick={onClose}
                className="press-button h-12 w-full rounded-full text-[15px] font-semibold text-text-secondary"
              >
                Annuler
              </button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleChange}
            />
            <input
              ref={libraryRef}
              type="file"
              accept={PHOTO_LIBRARY_ACCEPT}
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleChange}
            />
          </div>
        </div>
      ) : null}
      <PhotoCropModal
        isOpen={isCropOpen}
        imageUrl={pendingImageUrl}
        ghostUrl={ghostUrl}
        onClose={onClose}
        onConfirm={handleConfirm}
      />
    </>
  )
}

export default AddPhotoFlow
