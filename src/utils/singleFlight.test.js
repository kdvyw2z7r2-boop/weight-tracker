import { describe, expect, it, vi } from 'vitest'
import { createSingleFlight } from './singleFlight'

describe('createSingleFlight', () => {
  it('les appels concurrents partagent une seule invocation', async () => {
    let resolve
    const fn = vi.fn(() => new Promise((r) => (resolve = r)))
    const run = createSingleFlight(fn)
    const a = run()
    const b = run()
    await Promise.resolve()
    resolve('ok')
    await expect(Promise.all([a, b])).resolves.toEqual(['ok', 'ok'])
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('après règlement, un nouvel appel relance fn', async () => {
    const fn = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    const run = createSingleFlight(fn)
    expect(await run()).toBe(1)
    expect(await run()).toBe(2)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('un rejet se propage à tous les appelants, puis on peut réessayer', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok')
    const run = createSingleFlight(fn)
    const a = run()
    const b = run()
    await expect(a).rejects.toThrow('boom')
    await expect(b).rejects.toThrow('boom')
    expect(await run()).toBe('ok')
  })
})
