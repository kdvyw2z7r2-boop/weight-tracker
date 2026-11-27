const EXPIRED_STATUSES = [400, 403]

/**
 * Télécharge une image (URL signée) en Blob. Si l'URL a expiré (400/403), `onExpired()`
 * fournit une nouvelle URL et on retente une seule fois ; toute autre erreur lève.
 */
export async function fetchWithRetry(url, { fetchFn = fetch, onExpired } = {}) {
  let response = await fetchFn(url)

  if (!response.ok && EXPIRED_STATUSES.includes(response.status) && onExpired) {
    const freshUrl = await onExpired()
    if (!freshUrl) throw new Error('URL de la photo expirée')
    response = await fetchFn(freshUrl)
  }

  if (!response.ok) throw new Error(`Chargement de la photo impossible (${response.status})`)
  return response.blob()
}

/** Photo sans URL signée, même après re-signature. */
export class PhotoUnavailableError extends Error {
  constructor() {
    super('Photo indisponible, réessaie plus tard.')
    this.name = 'PhotoUnavailableError'
  }
}

/**
 * Blob d'une photo `{ date, url }`. URL absente = expirée : `refresh()` (table re-signée)
 * fournit l'URL ; toujours absente -> PhotoUnavailableError.
 */
export async function fetchPhotoBlob(photo, { refresh, fetchFn = fetch } = {}) {
  const freshUrl = async () => (await refresh())[photo.date]?.url ?? null
  const url = photo.url ?? (await freshUrl())
  if (!url) throw new PhotoUnavailableError()
  return fetchWithRetry(url, { fetchFn, onExpired: freshUrl })
}
