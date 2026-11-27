import { useEffect, useRef } from 'react'

// Verrou de défilement compté : plusieurs dialogues empilés ne se débloquent pas l'un l'autre.
let scrollLocks = 0

function lockScroll() {
  scrollLocks += 1
  document.body.style.overflow = 'hidden'
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1)
  if (scrollLocks === 0) document.body.style.overflow = ''
}

/**
 * Bases d'un dialogue modal : Échap ferme, focus déplacé à l'ouverture (initialFocusRef ou
 * premier élément focusable de containerRef) et rendu à la fermeture, défilement verrouillé.
 */
function useDialogBasics({ open, onClose, containerRef, initialFocusRef }) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return undefined
    const returnTo = document.activeElement
    lockScroll()
    // Double rAF : le dialogue peut n'être monté qu'au rendu suivant (animation d'entrée).
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(focusInitial)
    })
    function focusInitial() {
      const target =
        initialFocusRef?.current ??
        containerRef?.current?.querySelector(
          'button:not([disabled]):not([tabindex="-1"]), [href], input:not([type="hidden"]):not([tabindex="-1"]), [tabindex="0"]',
        )
      target?.focus?.()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      unlockScroll()
      if (returnTo instanceof HTMLElement && returnTo.isConnected) returnTo.focus()
    }
    // Refs stables : l'effet ne dépend que de l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

export default useDialogBasics
