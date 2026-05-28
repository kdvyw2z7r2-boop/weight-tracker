import { kv } from '@vercel/kv'

const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{3,128}$/

function getUserId(req) {
  const urlUserId = req.query?.userId
  const bodyUserId = req.body?.userId
  const userId = Array.isArray(urlUserId) ? urlUserId[0] : urlUserId || bodyUserId

  return typeof userId === 'string' && USER_ID_PATTERN.test(userId) ? userId : null
}

function parseBody(body) {
  if (!body || typeof body !== 'string') return body

  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (req.method === 'POST') {
      req.body = parseBody(req.body)
    }

    const userId = getUserId(req)
    if (!userId) {
      return res.status(400).json({ error: 'Missing or invalid userId' })
    }

    const key = `weights:${userId}`

    if (req.method === 'GET') {
      const weights = await kv.get(key)
      return res.status(200).json(Array.isArray(weights) ? weights : [])
    }

    const weightsData = req.body?.weights
    if (!Array.isArray(weightsData)) {
      return res.status(400).json({ error: 'weights must be an array' })
    }

    await kv.set(key, weightsData)
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('KV weights API error:', error)
    return res.status(500).json({ error: 'Unable to access weights storage' })
  }
}
