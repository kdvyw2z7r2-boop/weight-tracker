import { useCallback, useEffect, useState } from 'react'
import { fetchWithRetry } from '../utils/fetchImage'

export default function usePhotoCrop() {
  const [pendingImageUrl, setPendingImageUrl] = useState(null)
  const [isCropOpen, setIsCropOpen] = useState(false)

  const revokeIfBlob = useCallback((url) => {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
  }, [])

  const clearPending = useCallback(() => {
    setPendingImageUrl((current) => {
      revokeIfBlob(current)
      return null
    })
    setIsCropOpen(false)
  }, [revokeIfBlob])

  const closeCrop = useCallback(() => {
    setIsCropOpen(false)
  }, [])

  const openCrop = useCallback(() => {
    setIsCropOpen(true)
  }, [])

  const handleFileSelect = useCallback(
    (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      setPendingImageUrl((current) => {
        revokeIfBlob(current)
        return URL.createObjectURL(file)
      })
      setIsCropOpen(false)
    },
    [revokeIfBlob],
  )

  const openCropFromUrl = useCallback(
    async (url, { onExpired } = {}) => {
      if (!url) return

      let nextUrl = url
      if (!url.startsWith('blob:')) {
        let blob
        try {
          blob = await fetchWithRetry(url, { onExpired })
        } catch (error) {
          throw new Error('Impossible de charger la photo.', { cause: error })
        }
        nextUrl = URL.createObjectURL(blob)
      }

      setPendingImageUrl((current) => {
        revokeIfBlob(current)
        return nextUrl
      })
      setIsCropOpen(true)
    },
    [revokeIfBlob],
  )

  useEffect(() => {
    return () => {
      revokeIfBlob(pendingImageUrl)
    }
  }, [pendingImageUrl, revokeIfBlob])

  return {
    pendingImageUrl,
    hasPendingImage: Boolean(pendingImageUrl),
    isCropOpen,
    handleFileSelect,
    openCrop,
    openCropFromUrl,
    closeCrop,
    clearPending,
  }
}
