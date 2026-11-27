import { useImperativeHandle, useRef, useState } from 'react'
import PhotoCropModal from '../PhotoCropModal'
import usePhotoCrop from '../../hooks/usePhotoCrop'
import { useToast } from '../../hooks/useToast'
import { PHOTO_LIBRARY_ACCEPT } from '../../utils/photo'

/**
 * Ajout / remplacement / recadrage minimal (fichier -> recadrage 9:16 -> envoi).
 * Provisoire : l'ajout guidé avec calque fantôme (Task 5) remplacera ce composant.
 * API impérative via `ref` : pick(date) doit être appelé dans le geste utilisateur (ouverture du sélecteur).
 */
function QuickPhotoFlow({ ref, onUpload }) {
  const inputRef = useRef(null)
  const [date, setDate] = useState(null)
  const { show } = useToast()
  const { pendingImageUrl, isCropOpen, handleFileSelect, openCrop, openCropFromUrl, closeCrop, clearPending } =
    usePhotoCrop()

  useImperativeHandle(
    ref,
    () => ({
      pick(nextDate) {
        setDate(nextDate)
        inputRef.current?.click()
      },
      async recrop(item) {
        if (!item?.url) return
        setDate(item.date)
        try {
          await openCropFromUrl(item.url)
        } catch (error) {
          show(error.message || 'Impossible de charger la photo.', { tone: 'error' })
        }
      },
    }),
    [openCropFromUrl, show],
  )

  const handleChange = (event) => {
    if (!event.target.files?.length) return
    handleFileSelect(event)
    openCrop()
  }

  const cancel = () => {
    closeCrop()
    clearPending()
  }

  const handleConfirm = async (blob) => {
    const target = date
    await onUpload(target, blob)
    cancel()
    show('Photo enregistrée', { tone: 'success' })
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_LIBRARY_ACCEPT}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      <PhotoCropModal isOpen={isCropOpen} imageUrl={pendingImageUrl} onClose={cancel} onConfirm={handleConfirm} />
    </>
  )
}

export default QuickPhotoFlow
