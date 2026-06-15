import { createClient } from '@supabase/supabase-js'
import { kv } from '@vercel/kv'

const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{3,128}$/
const DATA_KEY_PREFIX = 'user:'
const LEGACY_WEIGHTS_PREFIX = 'weights:'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

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

function rowToEntry(row) {
  return {
    id: row.id,
    date: row.date,
    weight: Number(row.weight),
    note: row.note ?? '',
    createdAt: Number(row.created_at),
  }
}

async function readUserDataFromKv(userId) {
  const key = `${DATA_KEY_PREFIX}${userId}`
  const stored = await kv.get(key)

  if (stored && typeof stored === 'object') {
    return {
      entries: Array.isArray(stored.entries) ? stored.entries : [],
      settings: stored.settings && typeof stored.settings === 'object' ? stored.settings : null,
    }
  }

  const legacyWeights = await kv.get(`${LEGACY_WEIGHTS_PREFIX}${userId}`)
  if (Array.isArray(legacyWeights)) {
    const migrated = { entries: legacyWeights, settings: null, migratedAt: Date.now() }
    await kv.set(key, migrated)
    return { entries: legacyWeights, settings: null }
  }

  return { entries: [], settings: null }
}

async function saveUserDataToKv(userId, entries, settings) {
  await kv.set(`${DATA_KEY_PREFIX}${userId}`, {
    entries,
    settings: settings ?? null,
    updatedAt: Date.now(),
  })
}

async function readUserDataFromSupabase(userId) {
  const [entriesResult, settingsResult] = await Promise.all([
    supabase.from('entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('user_settings').select('settings').eq('user_id', userId).maybeSingle(),
  ])

  if (entriesResult.error) throw entriesResult.error
  if (settingsResult.error) throw settingsResult.error

  return {
    entries: (entriesResult.data ?? []).map(rowToEntry),
    settings: settingsResult.data?.settings ?? null,
  }
}

async function saveUserDataToSupabase(userId, entries, settings) {
  const { data: existingRows, error: existingError } = await supabase
    .from('entries')
    .select('id')
    .eq('user_id', userId)

  if (existingError) throw existingError

  const existingIds = new Set((existingRows ?? []).map((row) => row.id))
  const nextIds = new Set(entries.map((entry) => entry.id))
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id))

  if (idsToDelete.length) {
    const { error } = await supabase.from('entries').delete().in('id', idsToDelete)
    if (error) throw error
  }

  if (entries.length) {
    const rows = entries.map((entry) => ({
      id: entry.id,
      user_id: userId,
      date: entry.date,
      weight: entry.weight,
      note: entry.note ?? '',
      created_at: entry.createdAt ?? Date.now(),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('entries').upsert(rows)
    if (error) throw error
  } else {
    const { error } = await supabase.from('entries').delete().eq('user_id', userId)
    if (error) throw error
  }

  const { error: settingsError } = await supabase.from('user_settings').upsert({
    user_id: userId,
    settings: settings ?? {},
    updated_at: new Date().toISOString(),
  })

  if (settingsError) throw settingsError
}

async function readUserData(userId) {
  if (supabase) return readUserDataFromSupabase(userId)
  return readUserDataFromKv(userId)
}

async function saveUserData(userId, entries, settings) {
  if (supabase) return saveUserDataToSupabase(userId, entries, settings)
  return saveUserDataToKv(userId, entries, settings)
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

    if (req.method === 'GET') {
      const data = await readUserData(userId)
      return res.status(200).json(data)
    }

    const entries = req.body?.entries
    const settings = req.body?.settings

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'entries must be an array' })
    }

    if (settings != null && typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings must be an object' })
    }

    await saveUserData(userId, entries, settings)

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Sync API error:', error)
    return res.status(500).json({ error: 'Unable to access cloud storage' })
  }
}
