import { useCallback, useEffect, useRef, useState } from 'react'

// Noyau sans React : planifie un commit différé par id, annulable.
export function createPendingQueue(onCommit, delayMs) {
  const timers = new Map()

  const commit = (id) => {
    if (!timers.has(id)) return
    clearTimeout(timers.get(id))
    timers.delete(id)
    onCommit(id)
  }

  return {
    schedule(id) {
      if (timers.has(id)) clearTimeout(timers.get(id))
      timers.set(id, setTimeout(() => commit(id), delayMs))
    },
    undo(id) {
      if (!timers.has(id)) return false
      clearTimeout(timers.get(id))
      timers.delete(id)
      return true
    },
    flush() {
      for (const id of [...timers.keys()]) commit(id)
    },
    size: () => timers.size,
  }
}

function usePendingDelete(onCommit, delayMs = 5000) {
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const commitRef = useRef(onCommit)
  const queueRef = useRef(null)

  useEffect(() => {
    commitRef.current = onCommit
  })

  useEffect(() => {
    const queue = createPendingQueue((id) => {
      commitRef.current(id)
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, delayMs)
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

  return { pendingIds, schedule, undo, hasPending: () => (queueRef.current?.size() ?? 0) > 0 }
}

export default usePendingDelete
