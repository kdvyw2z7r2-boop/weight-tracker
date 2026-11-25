import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPendingQueue } from './usePendingDelete'

describe('createPendingQueue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('commits after the delay', () => {
    const onCommit = vi.fn()
    const q = createPendingQueue(onCommit, 5000)
    q.schedule('a')
    vi.advanceTimersByTime(4999)
    expect(onCommit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onCommit).toHaveBeenCalledWith(['a'])
    expect(q.size()).toBe(0)
  })

  it('does not commit after undo', () => {
    const onCommit = vi.fn()
    const q = createPendingQueue(onCommit, 5000)
    q.schedule('a')
    expect(q.undo('a')).toBe(true)
    vi.advanceTimersByTime(10000)
    expect(onCommit).not.toHaveBeenCalled()
    expect(q.undo('a')).toBe(false)
  })

  it('flush commits all pending ids in a single call, once', () => {
    const onCommit = vi.fn()
    const q = createPendingQueue(onCommit, 5000)
    q.schedule('a')
    q.schedule('b')
    q.flush()
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect([...onCommit.mock.calls[0][0]].sort()).toEqual(['a', 'b'])
    vi.advanceTimersByTime(10000)
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('flush calls onFlush before committing, and not when empty', () => {
    const order = []
    const q = createPendingQueue(() => order.push('commit'), 5000, () => order.push('flush'))
    q.flush()
    expect(order).toEqual([])
    q.schedule('a')
    q.flush()
    expect(order).toEqual(['flush', 'commit'])
  })
})
