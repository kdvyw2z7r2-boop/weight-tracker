import { useState } from 'react'

const USER_ID_STORAGE_KEY = 'wt_user_id'
const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{3,128}$/

function isValidUserId(userId) {
  return USER_ID_PATTERN.test(userId)
}

function createUserId() {
  const random = crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`
  return `user_${random.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)}`
}

function readStoredUserId() {
  try {
    const storedUserId = window.localStorage.getItem(USER_ID_STORAGE_KEY)
    return storedUserId && isValidUserId(storedUserId) ? storedUserId : null
  } catch {
    return null
  }
}

function storeUserId(userId) {
  try {
    window.localStorage.setItem(USER_ID_STORAGE_KEY, userId)
  } catch {
    // The URL remains the source of truth if local storage is unavailable.
  }
}

function replaceUrlUserId(userId) {
  const url = new URL(window.location.href)
  url.searchParams.set('id', userId)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

function resolveUserId() {
  if (typeof window === 'undefined') return createUserId()

  const url = new URL(window.location.href)
  const urlUserId = url.searchParams.get('id')?.trim()
  const storedUserId = readStoredUserId()

  if (urlUserId && isValidUserId(urlUserId)) {
    storeUserId(urlUserId)
    return urlUserId
  }

  const userId = storedUserId ?? createUserId()
  storeUserId(userId)
  replaceUrlUserId(userId)
  return userId
}

function useUserId() {
  const [userId] = useState(resolveUserId)
  return userId
}

export default useUserId
