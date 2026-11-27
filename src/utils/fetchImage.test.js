import { describe, expect, it, vi } from 'vitest'
import { fetchWithRetry } from './fetchImage'

const res = (status, blob = new Blob(['x'])) => ({ ok: status >= 200 && status < 300, status, blob: async () => blob })

describe('fetchWithRetry', () => {
  it('200 -> blob, sans onExpired', async () => {
    const blob = new Blob(['ok'])
    const fetchFn = vi.fn().mockResolvedValue(res(200, blob))
    const onExpired = vi.fn()
    await expect(fetchWithRetry('u1', { fetchFn, onExpired })).resolves.toBe(blob)
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('403 puis 200 -> onExpired une fois, nouvelle URL utilisée', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(res(403)).mockResolvedValueOnce(res(200))
    const onExpired = vi.fn().mockResolvedValue('u2')
    await fetchWithRetry('u1', { fetchFn, onExpired })
    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenNthCalledWith(2, 'u2')
  })

  it('400 est traité comme une expiration', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(res(400)).mockResolvedValueOnce(res(200))
    const onExpired = vi.fn().mockResolvedValue('u2')
    await fetchWithRetry('u1', { fetchFn, onExpired })
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('403 puis 403 -> rejette après une seule nouvelle tentative', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(403))
    const onExpired = vi.fn().mockResolvedValue('u2')
    await expect(fetchWithRetry('u1', { fetchFn, onExpired })).rejects.toThrow()
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('500 -> rejette sans onExpired', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(500))
    const onExpired = vi.fn()
    await expect(fetchWithRetry('u1', { fetchFn, onExpired })).rejects.toThrow()
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('onExpired sans nouvelle URL -> rejette', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(403))
    await expect(fetchWithRetry('u1', { fetchFn, onExpired: async () => null })).rejects.toThrow()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
