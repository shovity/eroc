import { redis } from './redis.js'
import { randomUUID } from 'node:crypto'

// Release only if the token matches, atomically
const RELEASE_SCRIPT = 'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end'
const RELEASE_CHANNEL = 'lock:release'

// Waiters on this process, keyed by lock key; woken by the release pub/sub
const waiters = new Map<string, PromiseWithResolvers<void>>()
let subscribed = false

async function subscribe(): Promise<void> {
  if (subscribed) return
  subscribed = true
  await redis.sub<string>(RELEASE_CHANNEL, (key) => {
    const waiter = waiters.get(key)
    if (waiter) {
      waiters.delete(key)
      waiter.resolve()
    }
  })
}

export const lock = {
  async acquire(key: string, ttl: number): Promise<string | null> {
    const token = randomUUID()
    const result = await redis.cmd<string | null>('SET', `lock:${key}`, token, 'NX', 'EX', String(ttl))
    return result === 'OK' ? token : null
  },

  async release(key: string, token: string): Promise<boolean> {
    const result = await redis.cmd<number>('EVAL', RELEASE_SCRIPT, '1', `lock:${key}`, token)
    await redis.pub(RELEASE_CHANNEL, key)
    return result === 1
  },

  /**
   * Run fn under the lock. If the lock is busy, wait until it is released
   * (across processes, via pub/sub) then retry.
   */
  async using<T>(key: string, fn: () => Promise<T>, ttl = 30): Promise<T> {
    await subscribe()

    const token = await lock.acquire(key, ttl)

    if (!token) {
      let waiter = waiters.get(key)
      if (!waiter) {
        waiter = Promise.withResolvers<void>()
        waiters.set(key, waiter)
      }
      await waiter.promise
      return lock.using(key, fn, ttl)
    }

    try {
      return await fn()
    } finally {
      await lock.release(key, token)
    }
  },
}
export type Lock = typeof lock
