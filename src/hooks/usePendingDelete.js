import { useCallback, useEffect, useRef, useState } from 'react'

// Noyau sans React : planifie un commit différé par id, annulable.
// onCommitMany reçoit un tableau d'ids (un seul appel par flush, pour une seule persistance).
// onFlush est appelé avant le commit d'un flush non vide.
export function createPendingQueue(onCommitMany, delayMs, onFlush) {
  const timers = new Map()

  const commitIds = (ids) => {
    const pending = ids.filter((id) => timers.has(id))
    if (!pending.length) return
    pending.forEach((id) => {
      clearTimeout(timers.get(id))
      timers.delete(id)
    })
    onCommitMany(pending)
  }

  return {
    schedule(id) {
      if (timers.has(id)) clearTimeout(timers.get(id))
      timers.set(id, setTimeout(() => commitIds([id]), delayMs))
    },
    undo(id) {
      if (!timers.has(id)) return false
      clearTimeout(timers.get(id))
      timers.delete(id)
      return true
    },
    flush() {
      if (!timers.size) return
      onFlush?.()
      commitIds([...timers.keys()])
    },
    size: () => timers.size,
  }
}

function usePendingDelete(onCommitMany, delayMs = 5000, onFlush) {
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const commitRef = useRef(onCommitMany)
  const flushRef = useRef(onFlush)
  const queueRef = useRef(null)

  useEffect(() => {
    commitRef.current = onCommitMany
    flushRef.current = onFlush
  })

  useEffect(() => {
    const queue = createPendingQueue(
      (ids) => {
        commitRef.current(ids)
        setPendingIds((prev) => {
          const next = new Set(prev)
          ids.forEach((id) => next.delete(id))
          return next
        })
      },
      delayMs,
      () => flushRef.current?.(),
    )
    queueRef.current = queue
    return () => {
      // Démontage : on valide immédiatement les suppressions en attente.
      queue.flush()
      queueRef.current = null
    }
  }, [delayMs])

  const schedule = useCallback((id) => {
    queueRef.current?.schedule(id)
    setPendingIds((prev) => new Set(prev).add(id))
  }, [])

  const undo = useCallback((id) => {
    queueRef.current?.undo(id)
    setPendingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  return { pendingIds, schedule, undo }
}

export default usePendingDelete
