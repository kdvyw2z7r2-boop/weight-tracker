import { useEffect, useMemo, useRef, useState } from 'react'
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion'
import { formatWeight } from '../../utils/format'
import { formatDateCompact, formatMonthYear } from '../../utils/locale'
import { groupByMonth } from '../../utils/progressPhotos'

const LONG_PRESS_MS = 500

/** Image de vignette : squelette pendant le chargement. */
function ThumbImage({ url, onFail }) {
  const [ready, setReady] = useState(false)

  return (
    <>
      {!ready ? (
        <span className="absolute inset-0 bg-bg-elevated motion-safe:animate-pulse" aria-hidden="true" />
      ) : null}
      <img
        src={url}
        alt=""
        draggable={false}
        loading="lazy"
        onLoad={() => setReady(true)}
        onError={onFail}
        className={`absolute inset-0 h-full w-full select-none object-cover ${ready ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  )
}

function TimelineItem({ photo, slot, showOptions, itemRef, onSelect, onOptions }) {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const longPress = useRef({ timer: null, fired: false })

  useEffect(() => () => clearTimeout(longPress.current.timer), [])

  const clearLongPress = () => {
    clearTimeout(longPress.current.timer)
    longPress.current.timer = null
  }

  const startLongPress = () => {
    clearLongPress()
    longPress.current.fired = false
    longPress.current.timer = setTimeout(() => {
      longPress.current.fired = true
      onOptions(photo)
    }, LONG_PRESS_MS)
  }

  const dateLabel = formatDateCompact(photo.date)
  const ring =
    slot === 'before' ? 'ring-2 ring-accent-blue' : slot === 'after' ? 'ring-2 ring-accent-purple' : 'ring-1 ring-border'
  const slotLabel = slot === 'before' ? 'Avant' : slot === 'after' ? 'Après' : null

  return (
    <li ref={itemRef} className="relative w-14 shrink-0">
      <button
        type="button"
        onClick={() => {
          if (longPress.current.fired) {
            longPress.current.fired = false
            return
          }
          onSelect(photo)
        }}
        onPointerDown={startLongPress}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
        onContextMenu={(event) => {
          event.preventDefault()
          clearLongPress()
          onOptions(photo)
        }}
        aria-pressed={Boolean(slot)}
        aria-label={`Photo du ${dateLabel}${slotLabel ? ` (${slotLabel.toLowerCase()})` : ''}`}
        className={`press-button relative block aspect-[9/16] w-14 overflow-hidden rounded-xl bg-bg-elevated ${ring} [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue`}
      >
        {photo.url && !failed ? (
          <ThumbImage key={`${photo.url}-${attempt}`} url={photo.url} onFail={() => setFailed(true)} />
        ) : null}
        {slotLabel ? (
          <span
            className={`pointer-events-none absolute inset-x-0 bottom-0 py-0.5 text-center text-[10px] font-bold ${
              slot === 'before' ? 'bg-accent-blue text-bg-primary' : 'bg-accent-purple text-white'
            }`}
          >
            {slotLabel}
          </span>
        ) : null}
      </button>
      {photo.url && failed ? (
        <button
          type="button"
          onClick={() => {
            setFailed(false)
            setAttempt((n) => n + 1)
          }}
          aria-label={`Réessayer de charger la photo du ${dateLabel}`}
          className="press-button absolute left-1/2 top-[calc(50%-10px)] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[18px] text-text-secondary"
        >
          ↻
        </button>
      ) : null}
      {showOptions ? (
        <button
          type="button"
          onClick={() => onOptions(photo)}
          aria-label={`Options de la photo du ${dateLabel}`}
          className="press-button absolute right-0 top-0 flex h-11 w-11 items-start justify-end p-1"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[13px] font-bold leading-none text-white">
            …
          </span>
        </button>
      ) : null}
      <p className="mt-1 text-center text-[11px] font-medium tabular-nums text-text-secondary">
        {formatWeight(photo.weight)}
      </p>
    </li>
  )
}

/**
 * Frise horizontale des photos (ancien -> récent), groupée par mois.
 * Toucher une vignette -> onSelect(photo) ; appui long ou « … » -> onOptions(photo).
 */
function PhotoTimeline({ photos, pair, activeSlot, onSelect, onOptions }) {
  const scrollerRef = useRef(null)
  const itemRefs = useRef({})
  const hasScrolledRef = useRef(false)
  const reducedMotion = usePrefersReducedMotion()
  const groups = useMemo(() => groupByMonth(photos), [photos])

  const beforeDate = pair?.before?.date ?? null
  const afterDate = pair?.after?.date ?? null
  const focusedDate = activeSlot === 'after' ? (afterDate ?? beforeDate) : beforeDate

  // Garde la vignette du slot actif visible (centrée) sans faire défiler la page.
  useEffect(() => {
    const scroller = scrollerRef.current
    const item = focusedDate ? itemRefs.current[focusedDate] : null
    if (!scroller || !item) return
    const left = item.offsetLeft - scroller.clientWidth / 2 + item.offsetWidth / 2
    scroller.scrollTo({
      left: Math.max(0, left),
      behavior: reducedMotion || !hasScrolledRef.current ? 'auto' : 'smooth',
    })
    hasScrolledRef.current = true
  }, [focusedDate, photos, reducedMotion])

  return (
    <div
      ref={scrollerRef}
      role="group"
      aria-label="Frise des photos"
      className="relative -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none]"
    >
      {groups.map((group) => (
        <section key={group.monthKey} className="shrink-0" aria-label={formatMonthYear(group.monthKey)}>
          <p className="section-label mb-2 whitespace-nowrap capitalize">{formatMonthYear(group.monthKey)}</p>
          <ul className="flex gap-2">
            {group.photos.map((photo) => (
              <TimelineItem
                key={`${photo.date}-${photo.url ?? ''}`}
                photo={photo}
                slot={photo.date === beforeDate ? 'before' : photo.date === afterDate ? 'after' : null}
                showOptions={photo.date === focusedDate}
                itemRef={(node) => {
                  itemRefs.current[photo.date] = node
                }}
                onSelect={onSelect}
                onOptions={onOptions}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default PhotoTimeline
