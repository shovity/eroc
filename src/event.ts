// src/event.ts
type EventHandler<T = unknown> = (data: T) => void | Promise<void>

const handlers = new Map<string, Set<EventHandler>>()

export const event = {
  emit(name: string, data: unknown): void {
    const set = handlers.get(name)
    if (!set) return
    for (const handler of set) {
      try {
        handler(data)
      } catch (err) {
        console.error(`event: handler error for ${name}`, err)
      }
    }
  },

  on<T = unknown>(name: string, handler: EventHandler<T>): void {
    if (!handlers.has(name)) {
      handlers.set(name, new Set())
    }
    handlers.get(name)!.add(handler as EventHandler)
  },

  off(name: string, handler: EventHandler): void {
    const set = handlers.get(name)
    set?.delete(handler)
  },
}

export type Event = typeof event
