import { useRef, useState } from 'react'
import { clampPercent, percentFromPointer } from '../../utils/curtain'
import { formatDateCompact } from '../../utils/locale'

// Largeur plafonnée (hauteur max min(62vh,560px) x 9/16) : le cadre reste exactement 9:16.
const FRAME =
  'relative aspect-[9/16] w-full max-w-[min(34.875vh,315px)] justify-self-center mx-auto overflow-hidden rounded-[16px] bg-bg-elevated'
const MAX_H = 'max-h-[min(62vh,560px)]'

function PhotoImage({ photo, ...props }) {
  return <PhotoImageInner key={photo.url ?? ''} photo={photo} {...props} />
}

function PhotoImageInner({ photo, onImageError, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (!photo.url || failed) {
    return (
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-elevated ${className}`}
      >
        {photo.url ? (
          <button
            type="button"
            onClick={() => {
              setFailed(false)
              onImageError?.(photo)
            }}
            className="press-button min-h-[44px] rounded-full bg-white/10 px-4 text-[12px] font-medium text-text-secondary"
          >
            Réessayer
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <img
      src={photo.url}
      alt=""
      draggable={false}
      loading="lazy"
      onError={() => {
        setFailed(true)
        onImageError?.(photo)
      }}
      className={`absolute inset-0 h-full w-full select-none object-cover ${className}`}
    />
  )
}

function Label({ children, align = 'left' }) {
  return (
    <span
      className={`pointer-events-none absolute bottom-2 ${
        align === 'left' ? 'left-2' : 'right-2'
      } rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white`}
    >
      {children}
    </span>
  )
}

function EmptyAfter() {
  return (
    <div
      className={`${FRAME} ${MAX_H} flex items-center justify-center border border-dashed border-border p-3 text-center`}
    >
      <p className="text-[13px] text-text-secondary">Reviens dans quelques jours</p>
    </div>
  )
}

function Curtain({ before, after, onImageError }) {
  const boxRef = useRef(null)
  const [percent, setPercent] = useState(50)

  const updateFromPointer = (event) => {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return
    setPercent(percentFromPointer(event.clientX, rect.left, rect.width))
  }

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(event)
  }

  const onPointerMove = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event)
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setPercent((p) => clampPercent(p - 5))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      setPercent((p) => clampPercent(p + 5))
    }
  }

  return (
    <div ref={boxRef} className={`${FRAME} ${MAX_H} touch-pan-y`}>
      <PhotoImage photo={before} onImageError={onImageError} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${percent}%)` }}>
        <PhotoImage photo={after} onImageError={onImageError} />
      </div>
      <Label>Avant · {formatDateCompact(before.date)}</Label>
      <Label align="right">Après · {formatDateCompact(after.date)}</Label>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Séparation avant / après"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={`${Math.round(percent)} % après`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="absolute inset-y-0 w-11 -translate-x-1/2 cursor-ew-resize touch-none outline-none focus-visible:[&>span:last-child]:ring-2 focus-visible:[&>span:last-child]:ring-accent-blue"
        style={{ left: `clamp(22px, ${percent}%, calc(100% - 22px))` }}
      >
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white" />
        <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[14px] text-black">
          ↔
        </span>
      </div>
    </div>
  )
}

function Fade({ before, after, onImageError }) {
  const [opacity, setOpacity] = useState(50)

  return (
    <div className="flex flex-col gap-1">
      <div className={`${FRAME} ${MAX_H}`}>
        <PhotoImage photo={before} onImageError={onImageError} />
        <div className="absolute inset-0" style={{ opacity: opacity / 100 }}>
          <PhotoImage photo={after} onImageError={onImageError} />
        </div>
        <Label>Avant · {formatDateCompact(before.date)}</Label>
        <Label align="right">Après · {formatDateCompact(after.date)}</Label>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={opacity}
        onChange={(event) => setOpacity(Number(event.target.value))}
        aria-label="Opacité de la photo après"
        className="h-11 w-full accent-white"
      />
    </div>
  )
}

function PhotoComparer({ before, after, mode = 'side', onImageError }) {
  if (!after) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className={`${FRAME} ${MAX_H}`}>
          <PhotoImage photo={before} onImageError={onImageError} />
          <Label>Avant · {formatDateCompact(before.date)}</Label>
        </div>
        <EmptyAfter />
      </div>
    )
  }

  if (mode === 'curtain') return <Curtain before={before} after={after} onImageError={onImageError} />
  if (mode === 'fade') return <Fade before={before} after={after} onImageError={onImageError} />

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className={`${FRAME} ${MAX_H}`}>
        <PhotoImage photo={before} onImageError={onImageError} />
        <Label>Avant · {formatDateCompact(before.date)}</Label>
      </div>
      <div className={`${FRAME} ${MAX_H}`}>
        <PhotoImage photo={after} onImageError={onImageError} />
        <Label>Après · {formatDateCompact(after.date)}</Label>
      </div>
    </div>
  )
}

export default PhotoComparer
