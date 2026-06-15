import { useCallback, useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import { PHOTO_ASPECT, cropImageToBlob } from '../utils/photo'

function PhotoCropModal({ isOpen, imageUrl, onClose, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setError('')
  }, [isOpen, imageUrl])

  const handleCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !imageUrl) return

    setIsProcessing(true)
    setError('')

    try {
      const blob = await cropImageToBlob(imageUrl, croppedAreaPixels)
      await onConfirm(blob)
    } catch (confirmError) {
      setError(confirmError.message || 'Impossible de recadrer la photo.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen || !imageUrl) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="press-button rounded-lg px-3 py-2 text-[15px] text-text-secondary disabled:opacity-40"
        >
          Annuler
        </button>
        <p className="text-[15px] font-semibold">Recadrer</p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing || !croppedAreaPixels}
          className="press-button rounded-lg px-3 py-2 text-[15px] font-medium text-white disabled:opacity-40"
        >
          {isProcessing ? '…' : 'Valider'}
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={PHOTO_ASPECT}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          objectFit="contain"
          showGrid={false}
        />
      </div>

      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
        <label className="mb-2 block text-center text-[12px] font-medium uppercase tracking-wide text-text-tertiary">
          Zoom
        </label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="w-full accent-white"
          aria-label="Zoom"
        />
        <p className="mt-3 text-center text-[12px] text-text-tertiary">
          Déplacez et zoomez pour cadrer votre photo en 9:16
        </p>
        {error ? <p className="mt-3 text-center text-sm text-accent-red">{error}</p> : null}
      </div>
    </div>
  )
}

export default PhotoCropModal
