// src/redis.ts
import { createClient, type RedisClientType } from 'redis'
import { config } from './config.js'
import { logger } from './logger.js'

let client: RedisClientType | null = null
let teardownRegistered = false

async function getClient(): Promise<RedisClientType> {
  if (client?.isOpen) return client

  if (!config.redis_uri) {
    throw new Error('redis: config.redis_uri is required')
  }

  client = createClient({ url: config.redis_uri })

  client.on('error', (err) => logger.error('redis: connection error', { error: String(err) }))

  await client.connect()
  logger.info(`redis: connected - ${config.redis_uri}`)

  return client
}

export const redis = {
  get client() {
    return client
  },

  async cmd<T = unknown>(...args: [string, ...unknown[]]): Promise<T> {
    const c = await getClient()
    return c.sendCommand(args as [string]) as Promise<T>
  },

  async get<T = string>(key: string): Promise<T | null> {
    const c = await getClient()
    const value = await c.get(key)
    return value as T | null
  },

  async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
    const c = await getClient()
    await c.set(key, value, options)
  },

  async del(key: string): Promise<number> {
    const c = await getClient()
    return c.del(key)
  },

  async expire(key: string, seconds: number): Promise<number> {
    const c = await getClient()
    return c.expire(key, seconds)
  },

  async hget(key: string, field: string): Promise<string | null> {
    const c = await getClient()
    return c.hGet(key, field) ?? null
  },

  async hset(key: string, field: string, value: string): Promise<number> {
    const c = await getClient()
    return c.hSet(key, field, value)
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    const c = await getClient()
    return c.hGetAll(key)
  },

  async hdel(key: string, field: string): Promise<number> {
    const c = await getClient()
    return c.hDel(key, field)
  },

  async pub(channel: string, message: string | object): Promise<number> {
    const c = await getClient()
    const payload = typeof message === 'string' ? message : JSON.stringify(message)
    return c.publish(channel, payload)
  },

  async sub(channel: string, callback: (message: string) => void): Promise<void> {
    const c = await getClient()
    const subscriber = c.duplicate()
    await subscriber.connect()
    await subscriber.subscribe(channel, callback)
  },

  async disconnect(): Promise<void> {
    if (client?.isOpen) {
      await client.quit()
      logger.info('redis: disconnected')
    }
  },
}

export type Redis = typeof redis
