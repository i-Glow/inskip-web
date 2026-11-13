import { describe, expect, it, vi } from 'vitest'
import { runPool } from '../../src/lib/concurrency'

const tick = () => new Promise((r) => setTimeout(r, 5))

describe('runPool', () => {
  it('respects the concurrency limit', async () => {
    let active = 0
    let max = 0
    const res = await runPool(
      Array.from({ length: 10 }, (_, i) => i),
      async (n) => {
        active++
        max = Math.max(max, active)
        await tick()
        active--
        return n * 2
      },
      { concurrency: 3 },
    )
    expect(max).toBe(3)
    expect(res.map((r) => r.ok && r.value)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18])
  })

  it('keeps going after failures and reports them', async () => {
    const res = await runPool(
      [1, 2, 3, 4],
      async (n) => {
        if (n % 2 === 0) throw new Error(`bad ${n}`)
        return n
      },
      { concurrency: 2 },
    )
    expect(res.map((r) => r.ok)).toEqual([true, false, true, false])
    const failed = res[1]
    expect(!failed.ok && (failed.error as Error).message).toBe('bad 2')
    expect(failed.item).toBe(2)
  })

  it('calls onProgress for each item with a growing count', async () => {
    const onProgress = vi.fn()
    await runPool([1, 2, 3], async (n) => n, { concurrency: 2, onProgress })
    expect(onProgress.mock.calls.map((c) => [c[0], c[1]])).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })

  it('handles an empty list', async () => {
    expect(await runPool([], async () => 1, { concurrency: 3 })).toEqual([])
  })
})
