// src/event.ts
// Distributed events across services via Redis pub/sub (channel: event.<name>)
import { redis } from './redis.js'
import { logger } from './logger.js'

type EventHandler<T = unknown> = (data: T) => void | Promise<void>

export const event = {
  emit(name: string, data?: unknown): void {
    redis.pub(`event.${name}`, data ?? null).catch((err) => {
      logger.error(`event: emit failed for ${name}`, { error: String(err) })
    })
  },

  async on<T = unknown>(name: string, handler: EventHandler<T>): Promise<void> {
    await redis.sub<T>(`event.${name}`, (data) => {
      Promise.resolve(handler(data)).catch((err) => {
        logger.error(`event: handler error for ${name}`, { error: String(err) })
      })
    })
  },
}

export type Event = typeof event
