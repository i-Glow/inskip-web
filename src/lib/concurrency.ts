export type PoolResult<T, R> =
  | { item: T; ok: true; value: R }
  | { item: T; ok: false; error: unknown }

export interface PoolOptions<T, R> {
  concurrency: number
  onProgress?: (done: number, total: number, result: PoolResult<T, R>) => void
}

/** Runs `worker` over `items` with at most `concurrency` in flight. Never rejects. */
export async function runPool<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  { concurrency, onProgress }: PoolOptions<T, R>,
): Promise<PoolResult<T, R>[]> {
  const results: PoolResult<T, R>[] = new Array(items.length)
  let next = 0
  let done = 0

  async function lane() {
    while (next < items.length) {
      const index = next++
      const item = items[index]
      let result: PoolResult<T, R>
      try {
        result = { item, ok: true, value: await worker(item) }
      } catch (error) {
        result = { item, ok: false, error }
      }
      results[index] = result
      done++
      try {
        onProgress?.(done, items.length, result)
      } catch {
        // a faulty progress callback must not stop the pool
      }
    }
  }

  const lanes = Math.max(1, Math.min(Math.floor(concurrency) || 1, items.length))
  await Promise.all(Array.from({ length: lanes }, lane))
  return results
}
