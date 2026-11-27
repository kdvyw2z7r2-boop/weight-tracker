import { useCallback, useEffect, useMemo, useState } from 'react'
import { newlyEarned } from '../utils/badges'

const SEEN_PREFIX = 'wt_badges_seen:'

function readSeen(userId) {
  if (!userId) return null
  try {
    const raw = window.localStorage.getItem(`${SEEN_PREFIX}${userId}`)
    if (raw == null) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : null
  } catch {
    return null
  }
}

function writeSeen(userId, ids) {
  try {
    window.localStorage.setItem(`${SEEN_PREFIX}${userId}`, JSON.stringify(ids))
  } catch {
    // Best-effort : au pire, la célébration ne sera pas mémorisée hors de cette session.
  }
}

/**
 * Badges à célébrer (obtenus, pas encore vus sur cet appareil). Premier lancement (aucune liste) :
 * les badges déjà obtenus sont marqués vus sans célébration (pas d'avalanche pour un utilisateur existant).
 */
function useBadgeCelebration({ badges, userId, ready }) {
  const [state, setState] = useState(() => ({ userId, seen: readSeen(userId) }))
  if (state.userId !== userId) setState({ userId, seen: readSeen(userId) })

  const earnedIds = useMemo(() => badges.filter((badge) => badge.earned).map((badge) => badge.id), [badges])

  useEffect(() => {
    if (!ready || !userId || state.userId !== userId || state.seen !== null) return
    writeSeen(userId, earnedIds)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialisation unique de la liste « vus »
    setState({ userId, seen: earnedIds })
  }, [ready, userId, state, earnedIds])

  const toCelebrate = useMemo(
    () => (ready && state.userId === userId && state.seen ? newlyEarned(badges, state.seen) : []),
    [ready, state, userId, badges],
  )

  const dismiss = useCallback(() => {
    if (!userId || !toCelebrate.length) return
    const next = [...new Set([...(state.seen ?? []), ...toCelebrate.map((badge) => badge.id)])]
    writeSeen(userId, next)
    setState({ userId, seen: next })
  }, [userId, toCelebrate, state.seen])

  return { toCelebrate, dismiss }
}

export default useBadgeCelebration
