import { useEffect } from 'react'
import { useDialogLayer } from './dialogStack'

/**
 * Bases d'un dialogue modal : Échap ferme, focus déplacé à l'ouverture (initialFocusRef ou
 * premier élément focusable de containerRef) et rendu à la fermeture, défilement verrouillé.
 */
function useDialogBasics({ open, onClose, containerRef, initialFocusRef }) {
  useDialogLayer(open, { onEscape: onClose })

  useEffect(() => {
    if (!open) return undefined
    const returnTo = document.activeElement
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
    return () => {
      cancelAnimationFrame(frame)
      if (returnTo instanceof HTMLElement && returnTo.isConnected) returnTo.focus()
    }
    // Refs stables : l'effet ne dépend que de l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

export default useDialogBasics
