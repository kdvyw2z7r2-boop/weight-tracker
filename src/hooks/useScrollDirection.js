import { useEffect, useState } from 'react'

const THRESHOLD = 8
const TOP_ZONE = 24

/**
 * Renvoie `true` quand la page défile vers le bas (élément à masquer) et
 * `false` dès qu'elle remonte ou qu'on est près du haut.
 */
export function useScrollDirection() {
  const [isScrollingDown, setIsScrollingDown] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = null

    const update = () => {
      frame = null
      const y = Math.max(window.scrollY, 0)
      if (y <= TOP_ZONE) {
        setIsScrollingDown(false)
        lastY = y
        return
      }
      const delta = y - lastY
      if (Math.abs(delta) < THRESHOLD) return
      setIsScrollingDown(delta > 0)
      lastY = y
    }

    const onScroll = () => {
      if (frame == null) frame = window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame != null) window.cancelAnimationFrame(frame)
    }
  }, [])

  return isScrollingDown
}

export default useScrollDirection
