import { useCallback, useId, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import useDialogBasics from '../hooks/useDialogBasics'
import { PHOTO_ASPECT, cropImageToBlob } from '../utils/photo'

function PhotoCropModal({ isOpen, imageUrl, ghostUrl = null, onClose, onConfirm }) {
  if (!isOpen || !imageUrl) return null
  // key : l'état du recadrage repart de zéro à chaque ouverture / nouvelle image
  return (
    <PhotoCropEditor key={imageUrl} imageUrl={imageUrl} ghostUrl={ghostUrl} onClose={onClose} onConfirm={onConfirm} />
  )
}

function PhotoCropEditor({ imageUrl, ghostUrl, onClose, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [guideOn, setGuideOn] = useState(true)
  // Taille réelle du cadre 9:16 calculée par react-easy-crop (centré dans la zone) : le fantôme s'y cale exactement.
  const [cropSize, setCropSize] = useState(null)
  const showGhost = Boolean(ghostUrl) && guideOn && cropSize != null
  const dialogRef = useRef(null)
  const titleId = useId()
  useDialogBasics({
    open: true,
    containerRef: dialogRef,
    onClose: () => {
      if (!isProcessing) onClose()
    },
  })

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

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[60] flex flex-col bg-bg-primary text-text-primary"
    >
      <div className="flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="press-button glass-pill h-11 px-4 text-[15px] font-semibold text-text-primary disabled:opacity-40"
        >
          Annuler
        </button>
        <h2 id={titleId} className="text-[17px] font-semibold">
          Recadrer
        </h2>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing || !croppedAreaPixels}
          className="btn-primary h-11 px-5 text-[15px] disabled:opacity-40"
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
          onCropSizeChange={setCropSize}
        />
        {ghostUrl && cropSize ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <img
              src={ghostUrl}
              alt=""
              data-testid="crop-ghost"
              draggable={false}
              style={{ width: cropSize.width, height: cropSize.height }}
              className={`object-cover transition-opacity duration-200 ${showGhost ? 'opacity-35' : 'opacity-0'}`}
            />
          </div>
        ) : null}
      </div>

      {ghostUrl ? (
        <div className="flex min-h-11 items-center justify-between gap-3 px-5 pt-2">
          <p className="text-[13px] text-text-secondary">{guideOn ? 'Cale-toi sur la photo précédente' : ' '}</p>
          <button
            type="button"
            role="switch"
            aria-checked={guideOn}
            onClick={() => setGuideOn((value) => !value)}
            className="press-button flex min-h-11 items-center gap-2 rounded-full px-2 text-[14px] font-semibold text-text-primary"
          >
            Guide
            <span
              aria-hidden="true"
              className={`relative h-[31px] w-[51px] rounded-full border transition-colors ${
                guideOn ? 'border-transparent bg-accent' : 'border-white/30 bg-white/25'
              }`}
            >
              <span
                className={`absolute top-[1px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all ${guideOn ? 'left-[21px]' : 'left-[1px]'}`}
              />
            </span>
          </button>
        </div>
      ) : null}

      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
        <p className="section-label mb-2 text-center" aria-hidden="true">
          Zoom
        </p>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="h-11 w-full accent-accent"
          aria-label="Zoom"
        />
        <p className="mt-1 text-center text-[13px] text-text-secondary">
          Déplacez et zoomez pour cadrer votre photo en 9:16
        </p>
        {error ? <p className="mt-3 text-center text-sm text-danger">{error}</p> : null}
      </div>
    </div>
  )
}

export default PhotoCropModal
