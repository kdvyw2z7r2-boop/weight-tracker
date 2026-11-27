import { useRef, useState } from 'react'
import { clampPercent, percentFromPointer } from '../../utils/curtain'
import { formatDateCompact } from '../../utils/locale'

// Largeur plafonnée (hauteur max min(62vh,560px) x 9/16) : le cadre reste exactement 9:16.
const FRAME =
  'relative aspect-[9/16] w-full max-w-[min(34.875vh,315px)] justify-self-center mx-auto overflow-hidden rounded-[16px] bg-white/5'
const MAX_H = 'max-h-[min(62vh,560px)]'

function PhotoImage({ photo, ...props }) {
  return <PhotoImageInner key={photo.url ?? ''} photo={photo} {...props} />
}

function PhotoImageInner({ photo, onImageError, onRetryUrl, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (!photo.url || failed) {
    return (
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/5 ${className}`}
      >
        {photo.url || onRetryUrl ? (
          <button
            type="button"
            onClick={() => {
              if (photo.url) {
                setFailed(false)
                onImageError?.(photo)
              } else {
                // URL signée absente : un seul rafraîchissement des URLs.
                onRetryUrl()
              }
            }}
            className="press-button min-h-[44px] rounded-full border border-white/15 bg-white/10 px-4 text-[13px] font-semibold text-text-primary"
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
      } ${DARK_PILL} px-2.5 py-1 text-[11px] font-semibold`}
    >
      {children}
    </span>
  )
}

// Pastille « verre sombre » (étiquettes posées sur la photo).
const DARK_PILL = 'rounded-full border border-white/15 bg-black/55 text-text-primary backdrop-blur-md'

const SLOT_TONES = {
  before: 'border border-transparent bg-text-primary text-bg-primary',
  after: 'border border-transparent bg-accent text-bg-primary',
}

/**
 * Étiquettes d'un cadre unique (rideau, fondu) : Avant en haut à gauche, Après en bas à droite
 * (jamais sur la même ligne), tronquées si le cadre est étroit. Avec `slots`, elles servent aussi
 * de sélecteur « Photo à modifier » (remplacent les pastilles sous le comparateur).
 */
function CornerLabels({ before, after, slots, afterOffset = '' }) {
  const items = [
    { key: 'before', text: `Avant · ${formatDateCompact(before.date)}`, pos: 'top-0 left-0 items-start justify-start' },
    { key: 'after', text: `Après · ${formatDateCompact(after.date)}`, pos: `${afterOffset || 'bottom-0'} right-0 items-end justify-end` },
  ]
  const pill = 'block min-w-0 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold'

  if (!slots) {
    return items.map((item) => (
      <span key={item.key} className={`pointer-events-none absolute flex max-w-full p-2 ${item.pos}`}>
        <span className={`${pill} ${DARK_PILL}`}>{item.text}</span>
      </span>
    ))
  }

  return (
    <div role="radiogroup" aria-label="Photo à modifier" className="pointer-events-none absolute inset-0">
      {items.map((item) => {
        const active = slots.active === item.key
        return (
          <button
            key={item.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => slots.onChange(item.key)}
            className={`pointer-events-auto absolute flex min-h-[44px] max-w-full p-2 outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-accent ${item.pos}`}
          >
            <span className={`${pill} ${active ? SLOT_TONES[item.key] : DARK_PILL}`}>
              {item.text}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function EmptyAfter() {
  return (
    <div
      className={`${FRAME} ${MAX_H} flex items-center justify-center border border-dashed border-white/25 p-3 text-center`}
    >
      <p className="text-[13px] text-text-secondary">Reviens dans quelques jours</p>
    </div>
  )
}

function Curtain({ before, after, slots, onImageError, onRetryUrl }) {
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
      <PhotoImage photo={before} onImageError={onImageError} onRetryUrl={onRetryUrl} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${percent}%)` }}>
        <PhotoImage photo={after} onImageError={onImageError} onRetryUrl={onRetryUrl} />
      </div>
      {/* Filet exactement sur le bord du clip ; seule la poignée (et sa zone tactile) est bornée. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/90 ring-1 ring-black/25"
        style={{ left: `${percent}%` }}
      />
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
        className="absolute inset-y-0 w-11 -translate-x-1/2 cursor-ew-resize touch-none outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-accent"
        style={{ left: `clamp(22px, ${percent}%, calc(100% - 22px))` }}
      >
        <span className="glass-pill absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-[15px] text-text-primary">
          ↔
        </span>
      </div>
      <CornerLabels before={before} after={after} slots={slots} />
    </div>
  )
}

function Fade({ before, after, slots, onImageError, onRetryUrl }) {
  const [opacity, setOpacity] = useState(50)

  // Curseur d'opacité dans le cadre (bas) : le cadre garde toute la hauteur disponible.
  return (
    <div className={`${FRAME} ${MAX_H}`}>
      <PhotoImage photo={before} onImageError={onImageError} onRetryUrl={onRetryUrl} />
      <div className="absolute inset-0" style={{ opacity: opacity / 100 }}>
        <PhotoImage photo={after} onImageError={onImageError} onRetryUrl={onRetryUrl} />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-3">
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(event) => setOpacity(Number(event.target.value))}
          aria-label="Opacité de la photo après"
          className="h-11 w-full accent-accent"
        />
      </div>
      <CornerLabels before={before} after={after} slots={slots} afterOffset="bottom-10" />
    </div>
  )
}

function PhotoComparer({ before, after, mode = 'side', slots, onImageError, onRetryUrl }) {
  if (!after) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className={`${FRAME} ${MAX_H}`}>
          <PhotoImage photo={before} onImageError={onImageError} onRetryUrl={onRetryUrl} />
          <Label>Avant · {formatDateCompact(before.date)}</Label>
        </div>
        <EmptyAfter />
      </div>
    )
  }

  const single = { before, after, slots, onImageError, onRetryUrl }
  if (mode === 'curtain') return <Curtain {...single} />
  if (mode === 'fade') return <Fade {...single} />

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className={`${FRAME} ${MAX_H}`}>
        <PhotoImage photo={before} onImageError={onImageError} onRetryUrl={onRetryUrl} />
        <Label>Avant · {formatDateCompact(before.date)}</Label>
      </div>
      <div className={`${FRAME} ${MAX_H}`}>
        <PhotoImage photo={after} onImageError={onImageError} onRetryUrl={onRetryUrl} />
        <Label>Après · {formatDateCompact(after.date)}</Label>
      </div>
    </div>
  )
}

export default PhotoComparer
