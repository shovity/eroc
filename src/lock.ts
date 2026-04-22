import { redis } from './redis.js'
import { randomUUID } from 'node:crypto'

export const lock = {
  async acquire(key: string, ttl: number): Promise<boolean> {
    const lockKey = `lock:${key}`
    const value = randomUUID()
    const result = await redis.set(lockKey, value, { EX: ttl })
    return result !== null
  },
  async release(key: string): Promise<void> {
    await redis.del(`lock:${key}`)
  },
  async using<T>(key: string, fn: () => Promise<T>, ttl = 30): Promise<T> {
    const acquired = await lock.acquire(key, ttl)
    if (!acquired) throw new Error(`lock: failed to acquire lock for ${key}`)
    try {
      return await fn()
    } finally {
      await lock.release(key)
    }
  },
}
export type Lock = typeof lock
