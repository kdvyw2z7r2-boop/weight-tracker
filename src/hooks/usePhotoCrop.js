import { useCallback, useEffect, useState } from 'react'

export default function usePhotoCrop() {
  const [cropImageUrl, setCropImageUrl] = useState(null)

  const closeCrop = useCallback(() => {
    setCropImageUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }, [])

  const openCropFromFile = useCallback((file) => {
    if (!file) return
    setCropImageUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }, [])

  const handleFileSelect = useCallback(
    (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      openCropFromFile(file)
    },
    [openCropFromFile],
  )

  useEffect(() => {
    return () => {
      if (cropImageUrl) URL.revokeObjectURL(cropImageUrl)
    }
  }, [cropImageUrl])

  return {
    cropImageUrl,
    isCropOpen: Boolean(cropImageUrl),
    closeCrop,
    handleFileSelect,
  }
}
