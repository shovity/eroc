import { redis } from './redis.js'
import { config } from './config.js'
interface EmitOptions {
  sid?: string
  uid?: string
  room?: string
}
export const socket = {
  async emit(event: string, data: unknown, options: EmitOptions = {}): Promise<void> {
    const channel = config.websocket_emitter ?? 'socket/in/emitter'
    await redis.pub(channel, { event, data, ...options })
  },
}
export type Socket = typeof socket
