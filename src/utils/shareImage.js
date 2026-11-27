import { formatWeightWithUnit } from './format'
import { PHOTO_ASPECT } from './photo'

export const SHARE_WIDTH = 1080
export const SHARE_HEIGHT = 960

const PAD = 32
const GAP = 24
const CAPTION_HEIGHT = 150
const RADIUS = 28

// Repli si les variables CSS sont illisibles (hors navigateur) ; valeurs alignées sur src/index.css.
const FALLBACK_COLORS = {
  bg: '#080808',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  textTertiary: '#858585',
  tile: '#1a1a1a',
}

/** Deux cadres 9:16 côte à côte, centrés ; légende en bas. Fonction pure. */
export function shareLayout({ width = SHARE_WIDTH, height = SHARE_HEIGHT } = {}) {
  const imageHeight = height - PAD * 2 - CAPTION_HEIGHT
  const imageWidth = Math.round(imageHeight * PHOTO_ASPECT)
  const left = Math.round((width - (imageWidth * 2 + GAP)) / 2)
  const top = PAD
  return {
    before: { x: left, y: top, width: imageWidth, height: imageHeight },
    after: { x: left + imageWidth + GAP, y: top, width: imageWidth, height: imageHeight },
    caption: { x: PAD, y: top + imageHeight, width: width - PAD * 2, height: height - PAD - (top + imageHeight) },
  }
}

const formatDays = (days) => `${days} jour${Math.abs(days) > 1 ? 's' : ''}`

/** « −5,2 kg en 46 jours », ou « 46 jours » sans écart de poids. */
export function buildShareCaption({ delta, days }, unit = 'kg') {
  if (delta == null) return formatDays(days)
  const sign = delta < 0 ? '−' : delta > 0 ? '+' : ''
  return `${sign}${formatWeightWithUnit(Math.abs(delta), unit)} en ${formatDays(days)}`
}

function readColors() {
  const style = getComputedStyle(document.documentElement)
  const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback
  return {
    bg: read('--color-bg-primary', FALLBACK_COLORS.bg),
    text: read('--color-text-primary', FALLBACK_COLORS.text),
    textSecondary: read('--color-text-secondary', FALLBACK_COLORS.textSecondary),
    textTertiary: read('--color-text-tertiary', FALLBACK_COLORS.textTertiary),
    tile: read('--color-bg-elevated', FALLBACK_COLORS.tile),
    font: getComputedStyle(document.body).fontFamily || 'sans-serif',
  }
}

function drawCover(ctx, bitmap, rect, tileColor) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, RADIUS)
  ctx.clip()
  ctx.fillStyle = tileColor
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
  const scale = Math.max(rect.width / bitmap.width, rect.height / bitmap.height)
  const sw = rect.width / scale
  const sh = rect.height / scale
  ctx.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, rect.x, rect.y, rect.width, rect.height)
  ctx.restore()
}

function drawLabel(ctx, text, rect, colors) {
  ctx.font = `600 26px ${colors.font}`
  const padX = 18
  const w = ctx.measureText(text).width + padX * 2
  const h = 44
  const x = rect.x + (rect.width - w) / 2
  const y = rect.y + rect.height - h - 18
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h / 2)
  ctx.fill()
  ctx.fillStyle = colors.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + w / 2, y + h / 2 + 1)
}

/** Compose l'image avant | après (PNG 1080×960). Nécessite un canvas (navigateur). */
export async function composeShareImage({ beforeBlob, afterBlob, beforeLabel, afterLabel, caption }) {
  const colors = readColors()
  const layout = shareLayout({ width: SHARE_WIDTH, height: SHARE_HEIGHT })
  const [beforeBitmap, afterBitmap] = await Promise.all([createImageBitmap(beforeBlob), createImageBitmap(afterBlob)])

  try {
    const canvas = document.createElement('canvas')
    canvas.width = SHARE_WIDTH
    canvas.height = SHARE_HEIGHT
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)

    drawCover(ctx, beforeBitmap, layout.before, colors.tile)
    drawCover(ctx, afterBitmap, layout.after, colors.tile)
    drawLabel(ctx, beforeLabel, layout.before, colors)
    drawLabel(ctx, afterLabel, layout.after, colors)

    const { caption: box } = layout
    const centerX = box.x + box.width / 2
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = colors.text
    ctx.font = `800 52px ${colors.font}`
    ctx.fillText(caption, centerX, box.y + box.height * 0.42)
    ctx.fillStyle = colors.textTertiary
    ctx.font = `500 26px ${colors.font}`
    ctx.fillText('Suivi de poids', centerX, box.y + box.height * 0.78)

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image non générée'))), 'image/png')
    })
  } finally {
    beforeBitmap.close?.()
    afterBitmap.close?.()
  }
}

/**
 * Partage le PNG (feuille de partage native si possible), sinon le télécharge.
 * -> 'shared' | 'downloaded' | 'cancelled'. Lève si le partage échoue ET que le téléchargement est impossible.
 */
export async function shareOrDownload(blob, date) {
  const filename = `avant-apres-${date}.png`
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Avant / après' })
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled'
      // autre échec du partage natif : repli sur le téléchargement
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return 'downloaded'
}
