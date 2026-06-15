export const PHOTO_LIBRARY_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

const TARGET_RATIO = 9 / 16
const MAX_WIDTH = 720
const WEBP_QUALITY = 0.75
const SIGNED_URL_TTL = 60 * 60 * 24 * 7

export { SIGNED_URL_TTL }

export function photoStoragePath(userId, date) {
  return `${userId}/${date}.webp`
}

export function processPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const sourceRatio = image.width / image.height
      let sourceX
      let sourceY
      let sourceWidth
      let sourceHeight

      if (sourceRatio > TARGET_RATIO) {
        sourceHeight = image.height
        sourceWidth = image.height * TARGET_RATIO
        sourceX = (image.width - sourceWidth) / 2
        sourceY = 0
      } else {
        sourceWidth = image.width
        sourceHeight = image.width / TARGET_RATIO
        sourceX = 0
        sourceY = (image.height - sourceHeight) / 2
      }

      const outputWidth = MAX_WIDTH
      const outputHeight = Math.round(MAX_WIDTH / TARGET_RATIO)
      const canvas = document.createElement('canvas')
      canvas.width = outputWidth
      canvas.height = outputHeight

      const context = canvas.getContext('2d')
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Impossible de compresser la photo.'))
            return
          }
          resolve(blob)
        },
        'image/webp',
        WEBP_QUALITY,
      )
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Impossible de lire la photo.'))
    }

    image.src = objectUrl
  })
}

export async function createSignedPhotoUrl(supabaseClient, storagePath) {
  const { data, error } = await supabaseClient.storage
    .from('progress-photos')
    .createSignedUrl(storagePath, SIGNED_URL_TTL)

  if (error) throw error
  return data.signedUrl
}
