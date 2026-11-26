import { describe, expect, it, vi } from 'vitest'
import { createSaveQueue } from './saveQueue'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createSaveQueue', () => {
  it('exécute une sauvegarde isolée et résout sa promesse', async () => {
    const queue = createSaveQueue()
    const task = vi.fn().mockResolvedValue(undefined)
    await expect(queue.enqueue(task)).resolves.toBeUndefined()
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('une seule sauvegarde à la fois', async () => {
    const queue = createSaveQueue()
    const first = deferred()
    let running = 0
    let maxRunning = 0
    const make = (d) => async () => {
      running++
      maxRunning = Math.max(maxRunning, running)
      await d.promise
      running--
    }
    const second = deferred()
    const p1 = queue.enqueue(make(first))
    const p2 = queue.enqueue(make(second))
    await flush()
    expect(running).toBe(1)
    first.resolve()
    await p1
    await flush()
    second.resolve()
    await p2
    expect(maxRunning).toBe(1)
  })

  it('coalescence : seule la DERNIÈRE en attente est exécutée, toutes les promesses se résolvent', async () => {
    const queue = createSaveQueue()
    const first = deferred()
    const calls = []
    const p1 = queue.enqueue(async () => {
      calls.push(1)
      await first.promise
    })
    const p2 = queue.enqueue(async () => calls.push(2))
    const p3 = queue.enqueue(async () => calls.push(3))
    const p4 = queue.enqueue(async () => calls.push(4))
    await flush()
    first.resolve()
    await Promise.all([p1, p2, p3, p4])
    expect(calls).toEqual([1, 4])
  })

  it('rejette les appels couverts par une sauvegarde qui échoue', async () => {
    const queue = createSaveQueue()
    const first = deferred()
    const p1 = queue.enqueue(() => first.promise)
    const err = new Error('offline')
    const p2 = queue.enqueue(() => Promise.reject(err))
    const p3 = queue.enqueue(() => Promise.reject(err))
    first.resolve()
    await expect(p1).resolves.toBeUndefined()
    await expect(p2).rejects.toBe(err)
    await expect(p3).rejects.toBe(err)
  })

  it('l\'échec de la sauvegarde en cours ne rejette pas les suivantes', async () => {
    const queue = createSaveQueue()
    const first = deferred()
    const p1 = queue.enqueue(() => first.promise)
    const second = vi.fn().mockResolvedValue(undefined)
    const p2 = queue.enqueue(second)
    first.reject(new Error('boom'))
    await expect(p1).rejects.toThrow('boom')
    await expect(p2).resolves.toBeUndefined()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('une erreur synchrone dans la tâche rejette sa promesse', async () => {
    const queue = createSaveQueue()
    await expect(
      queue.enqueue(() => {
        throw new Error('sync')
      }),
    ).rejects.toThrow('sync')
    await expect(queue.enqueue(async () => 'ok')).resolves.toBe('ok')
  })

  it('fonctionne avec des timers simulés', async () => {
    vi.useFakeTimers()
    try {
      const queue = createSaveQueue()
      const calls = []
      const slow = (label, ms) => () =>
        new Promise((resolve) => setTimeout(() => {
          calls.push(label)
          resolve()
        }, ms))
      const p1 = queue.enqueue(slow('a', 100))
      const p2 = queue.enqueue(slow('b', 100))
      const p3 = queue.enqueue(slow('c', 100))
      await vi.advanceTimersByTimeAsync(100)
      expect(calls).toEqual(['a'])
      await vi.advanceTimersByTimeAsync(100)
      await Promise.all([p1, p2, p3])
      expect(calls).toEqual(['a', 'c'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('résout chaque appel avec le résultat de la sauvegarde qui le couvre', async () => {
    const queue = createSaveQueue()
    const first = deferred()
    const p1 = queue.enqueue(() => first.promise)
    const p2 = queue.enqueue(async () => 'deux')
    const p3 = queue.enqueue(async () => 'trois')
    first.resolve('un')
    await expect(p1).resolves.toBe('un')
    await expect(p2).resolves.toBe('trois')
    await expect(p3).resolves.toBe('trois')
  })
})
