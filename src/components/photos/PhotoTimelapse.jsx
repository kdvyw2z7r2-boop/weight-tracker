import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion'
import { formatWeightWithUnit } from '../../utils/format'
import { formatDateCompact } from '../../utils/locale'
import { FRAME_INTERVAL_MS, nextFrameIndex, prevFrameIndex } from '../../utils/timelapse'

const PRELOAD_AHEAD = 2

const ROUND_BUTTON =
  'press-button glass-pill flex h-12 min-w-12 items-center justify-center px-4 text-[15px] font-semibold text-text-primary disabled:opacity-40'

/** Défilé plein écran des photos, du plus ancien au plus récent (4 images/s). */
function PhotoTimelapse({ photos, unit = 'kg', onClose }) {
  const reducedMotion = usePrefersReducedMotion()
  const frames = useMemo(() => photos.filter((p) => p.url), [photos])
  const last = frames.length - 1
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(() => !reducedMotion)
  const titleId = useId()
  const closeRef = useRef(null)

  const ended = index >= last
  const isPlaying = playing && !reducedMotion && !ended

  // Focus : sur « Fermer » à l'ouverture, restauré sur l'élément précédent à la fermeture.
  useEffect(() => {
    const toRestore = document.activeElement
    closeRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      if (toRestore instanceof HTMLElement && toRestore.isConnected) toRestore.focus()
    }
  }, [])

  // Lecture : une image toutes les 250 ms, arrêt sur la dernière image.
  useEffect(() => {
    if (!isPlaying) return undefined
    const timer = setTimeout(() => {
      setIndex((current) => nextFrameIndex(current, frames.length, { loop: false }))
    }, FRAME_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [isPlaying, index, frames.length])

  // Préchargement des prochaines images.
  useEffect(() => {
    for (let i = 1; i <= PRELOAD_AHEAD; i += 1) {
      const next = frames[index + i]
      if (next) new Image().src = next.url
    }
  }, [frames, index])

  const togglePlay = useCallback(() => {
    if (reducedMotion) return
    if (ended) {
      setIndex(0)
      setPlaying(true)
    } else {
      setPlaying((value) => !value)
    }
  }, [reducedMotion, ended])

  const step = useCallback(
    (direction) => {
      setPlaying(false)
      setIndex((current) =>
        direction > 0 ? nextFrameIndex(current, frames.length) : prevFrameIndex(current, frames.length),
      )
    },
    [frames.length],
  )

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      const target = event.target
      const onButton = target instanceof HTMLElement && target.tagName === 'BUTTON'
      const onRange = target instanceof HTMLInputElement && target.type === 'range'
      if (event.key === 'ArrowRight' && !onRange) step(1)
      else if (event.key === 'ArrowLeft' && !onRange) step(-1)
      else if (event.key === ' ' && !onButton) {
        event.preventDefault()
        togglePlay()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, step, togglePlay])

  const frame = frames[Math.min(index, Math.max(last, 0))]

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-bg-primary pt-[env(safe-area-inset-top)] pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <h2 id={titleId} className="sr-only">
        Défilé des photos
      </h2>
      <div className="flex justify-end px-4 pt-3">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer" className={ROUND_BUTTON}>
          Fermer
        </button>
      </div>

      <div className="relative mx-auto flex min-h-0 w-full flex-1 items-center justify-center px-4 py-3">
        {frame ? (
          <div className="relative h-full max-w-full" style={{ aspectRatio: '9 / 16' }}>
            <img
              src={frame.url}
              alt={`Photo du ${frame.date}`}
              className="h-full w-full rounded-[16px] object-cover"
              draggable={false}
            />
            <div className="absolute inset-x-0 bottom-0 rounded-b-[16px] bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-white">
              <p className="text-[17px] font-bold">{formatDateCompact(frame.date)}</p>
              <p className="text-[14px] tabular-nums text-white/80">{formatWeightWithUnit(frame.weight, unit)}</p>
            </div>
          </div>
        ) : (
          <p className="text-[15px] text-text-secondary">Aucune photo à afficher.</p>
        )}
      </div>

      <div className="mx-auto w-full max-w-md space-y-3 px-4">
        <input
          type="range"
          min={0}
          max={Math.max(last, 0)}
          step={1}
          value={Math.min(index, Math.max(last, 0))}
          aria-label="Position dans le défilé"
          aria-valuetext={frame ? formatDateCompact(frame.date) : undefined}
          onChange={(event) => {
            setPlaying(false)
            setIndex(Number(event.target.value))
          }}
          className="block h-11 w-full cursor-pointer accent-accent"
        />
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={index <= 0}
            aria-label="Photo précédente"
            className={ROUND_BUTTON}
          >
            ←
          </button>
          {reducedMotion ? null : (
            <button type="button" onClick={togglePlay} className={`${ROUND_BUTTON} min-w-28`}>
              {ended ? 'Rejouer' : isPlaying ? 'Pause' : 'Lecture'}
            </button>
          )}
          <button
            type="button"
            onClick={() => step(1)}
            disabled={ended}
            aria-label="Photo suivante"
            className={ROUND_BUTTON}
          >
            →
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default PhotoTimelapse
