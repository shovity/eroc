import { AsyncLocalStorage } from 'node:async_hooks'
import type { RequestHandler } from 'express'
import { randomUUID } from 'node:crypto'

const storage = new AsyncLocalStorage<Map<string, unknown>>()

export const tx = {
  get<T = unknown>(key: string): T | undefined {
    const store = storage.getStore()
    return store?.get(key) as T | undefined
  },

  set(key: string, value: unknown): void {
    const store = storage.getStore()
    store?.set(key, value)
  },

  run<T>(fn: () => T | Promise<T>): T | Promise<T> {
    return storage.run(new Map(), fn)
  },

  init(): RequestHandler {
    return (req, res, next) => {
      storage.run(new Map(), () => {
        tx.set('txid', randomUUID())
        tx.set('req', req)
        tx.set('res', res)
        next()
      })
    }
  },
}

export type Tx = typeof tx
