import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { pub, sub, type SubContext } from './kafka.js'
import { tx } from './tx.js'
import { config } from './config.js'
import { logger } from './logger.js'

interface TaskMeta {
  sender: string
  trips: string[]
  loop: number
  timestamp: number
}
type TaskHandler<T = unknown> = (data: T, meta: TaskMeta) => void | Promise<void>

// Carries sender/trips across nested task.emit calls inside a handler
const storage = new AsyncLocalStorage<Map<string, unknown>>()

function signPayload(payload: unknown): string {
  return createHmac('sha256', config.kafka_hmac_secret).update(JSON.stringify(payload)).digest('hex')
}

function verifyPayload(payload: unknown, signature: unknown): boolean {
  if (typeof signature !== 'string' || !signature) return false

  const a = Buffer.from(signPayload(payload), 'hex')
  const b = Buffer.from(signature, 'hex')

  // timingSafeEqual throws on length mismatch -> check first
  return a.length === b.length && timingSafeEqual(a, b)
}

export const task = {
  async emit<T = unknown>(name: string, data: T, key?: string): Promise<void> {
    const topic = `task.${name}`

    const meta = {
      sender: (storage.getStore()?.get('sender') as string) ?? tx.get<string>('txid') ?? randomUUID(),
      trips: (storage.getStore()?.get('trips') as string[]) ?? [],
      timestamp: Date.now(),
    }

    // Sign the message when a secret is configured (defense-in-depth)
    if (config.kafka_hmac_secret) {
      return pub(topic, { data, meta, signature: signPayload({ data, meta }) }, key)
    }

    return pub(topic, { data, meta }, key)
  },

  async on<T = unknown>(name: string, handler: TaskHandler<T>): Promise<void> {
    const topic = `task.${name}`

    const option = {
      group: `${config.service}:${config.env}:${topic}`,
      fb: true,
      retry: 12,
    }

    // Local: ephemeral group + no replay, so tasks behave like plain events
    if (config.env === 'local') {
      option.fb = false
      option.group += Date.now()
    }

    await sub<{ data: T; meta: TaskMeta; signature?: string }>(
      topic,
      async ({ data, meta, signature }, ctx: SubContext) => {
        // Verify BEFORE any meta mutation; forged messages are dropped
        if (config.kafka_hmac_secret && !verifyPayload({ data, meta }, signature)) {
          logger.error('task: rejected — invalid signature', { topic: name, meta })
          return
        }

        return storage.run(new Map(), () => {
          meta.loop = meta.trips.filter((trip) => trip === name).length
          meta.trips.push(name)

          if (meta.trips.length > config.task_trip_max) {
            logger.error('task: break — reached maximum trip', { meta })
            return
          }

          if (meta.loop > config.task_loop_max) {
            logger.error('task: break — reached maximum loop', { meta })
            return
          }

          storage.getStore()!.set('sender', meta.sender)
          storage.getStore()!.set('trips', [...meta.trips])

          meta.timestamp = Number(ctx.message.timestamp)
          return handler(data, meta)
        })
      },
      option,
    )
  },
}

export type Task = typeof task
export type { TaskMeta, TaskHandler }
