// src/redis.ts
import { createClient, type RedisClientType } from 'redis'
import { config } from './config.js'
import { logger } from './logger.js'
import { util } from './util.js'

let client: RedisClientType | null = null
const subscribers: RedisClientType[] = []

async function getClient(): Promise<RedisClientType> {
  if (client?.isOpen) return client

  if (!config.redis_uri) {
    throw new Error('redis: config.redis_uri is required')
  }

  client = createClient({ url: config.redis_uri })

  client.on('error', (err) => logger.error('redis: connection error', { error: String(err) }))

  await client.connect()
  logger.info(`redis: connected - ${util.maskUri(config.redis_uri)}`)

  return client
}

// Values are JSON-serialized on write and parsed on read, so callers can
// store objects directly
export const redis = {
  get client() {
    return client
  },

  getClient,

  async cmd<T = unknown>(...args: [string, ...unknown[]]): Promise<T> {
    const c = await getClient()
    return c.sendCommand(args as [string]) as Promise<T>
  },

  async get<T = unknown>(key: string): Promise<T | null> {
    const c = await getClient()
    const value = await c.get(key)
    return value === null ? null : (JSON.parse(value) as T)
  },

  async set(key: string, value: unknown, options?: { EX?: number; PX?: number; NX?: boolean }): Promise<string | null> {
    const c = await getClient()
    return c.set(key, JSON.stringify(value), options)
  },

  async getdel<T = unknown>(key: string): Promise<T | null> {
    const c = await getClient()
    const value = await c.getDel(key)
    return value === null ? null : (JSON.parse(value) as T)
  },

  async del(key: string): Promise<number> {
    const c = await getClient()
    return c.del(key)
  },

  async expire(key: string, seconds: number): Promise<number> {
    const c = await getClient()
    return c.expire(key, seconds)
  },

  async hget<T = unknown>(key: string, field: string): Promise<T | null> {
    const c = await getClient()
    const value = await c.hGet(key, field)
    return value == null ? null : (JSON.parse(value) as T)
  },

  async hset(key: string, field: string, value: unknown): Promise<number> {
    const c = await getClient()
    return c.hSet(key, field, JSON.stringify(value))
  },

  async hgetall<T = unknown>(key: string): Promise<Record<string, T>> {
    const c = await getClient()
    const reply = await c.hGetAll(key)
    const result: Record<string, T> = {}
    for (const [k, v] of Object.entries(reply)) {
      result[k] = JSON.parse(v as string) as T
    }
    return result
  },

  async hdel(key: string, field: string): Promise<number> {
    const c = await getClient()
    return c.hDel(key, field)
  },

  async pub(channel: string, message: unknown): Promise<number> {
    const c = await getClient()
    return c.publish(channel, JSON.stringify(message))
  },

  // Pattern subscribe — messages are JSON-parsed before the callback
  async sub<T = unknown>(channel: string, callback: (message: T, channel: string) => void): Promise<void> {
    const c = await getClient()
    const subscriber = c.duplicate()
    await subscriber.connect()
    await subscriber.pSubscribe(channel, (message, ch) => {
      try {
        callback(JSON.parse(message) as T, ch)
      } catch (err) {
        logger.error(`redis: sub handler error for ${ch}`, { error: String(err) })
      }
    })
    subscribers.push(subscriber as RedisClientType)
  },

  async disconnect(): Promise<void> {
    await Promise.all(subscribers.splice(0).map((s) => (s.isOpen ? s.quit().catch(() => {}) : null)))
    if (client?.isOpen) {
      await client.quit()
      logger.info('redis: disconnected')
    }
  },
}

export type Redis = typeof redis
