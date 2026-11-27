import { useEffect, useRef, useSyncExternalStore } from 'react'

// Pile globale des dialogues ouverts : un seul verrou de défilement compté, et seul le dialogue
// du dessus réagit à Échap (les dialogues empilés ne se ferment pas en cascade).
const stack = []
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

function onDocumentKeyDown(event) {
  if (event.key !== 'Escape' || !stack.length) return
  const top = stack[stack.length - 1]
  if (!top.onEscapeRef.current) return
  event.stopPropagation()
  top.onEscapeRef.current()
}

function push(entry) {
  if (!stack.length) {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onDocumentKeyDown)
  }
  stack.push(entry)
  emit()
  return () => {
    const index = stack.indexOf(entry)
    if (index !== -1) stack.splice(index, 1)
    if (!stack.length) {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onDocumentKeyDown)
    }
    emit()
  }
}

/**
 * Inscrit un dialogue ouvert dans la pile : verrouille le défilement tant qu'au moins un dialogue
 * est ouvert et appelle `onEscape` sur Échap uniquement s'il est au sommet de la pile.
 * `kind: 'celebration'` : ne bloque pas l'affichage d'une célébration (cf. useBlockingDialogOpen).
 */
export function useDialogLayer(open, { onEscape, kind = 'dialog' } = {}) {
  const onEscapeRef = useRef(onEscape)
  useEffect(() => {
    onEscapeRef.current = onEscape
  })
  useEffect(() => {
    if (!open) return undefined
    return push({ kind, onEscapeRef })
  }, [open, kind])
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function hasBlockingDialog() {
  return stack.some((entry) => entry.kind !== 'celebration')
}

/** Vrai tant qu'un dialogue (hors célébration) est ouvert : la célébration attend sa fermeture. */
export function useBlockingDialogOpen() {
  return useSyncExternalStore(subscribe, hasBlockingDialog, () => false)
}
