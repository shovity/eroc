import type { RequestHandler } from 'express'
import { redis } from './redis.js'
import { createHash } from 'node:crypto'

function md5(str: string): string {
  return createHash('md5').update(str).digest('hex')
}

export const cacher = {
  middle(options: { expire?: number; prefix?: string } = {}): RequestHandler {
    const { expire = 173200, prefix = '' } = options
    return async (req, res, next) => {
      const key = `cacher:middle:${prefix}:${req.baseUrl}${req.path}:${md5(JSON.stringify(req.query))}`
      try {
        const cached = await redis.get(key)
        if (cached) {
          res.setHeader('X-Cache', 'HIT')
          return res.json(JSON.parse(cached))
        }
      } catch {
        /* Redis not available */
      }
      const originalJson = res.json.bind(res)
      res.json = (body: unknown) => {
        redis.set(key, JSON.stringify(body), { EX: expire }).catch(() => {})
        res.setHeader('X-Cache', 'MISS')
        return originalJson(body)
      }
      next()
    }
  },
  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.cmd<string[]>('KEYS', `cacher:*${pattern}*`)
    if (keys.length > 0) await Promise.all(keys.map((k) => redis.del(k)))
  },
}
export type Cacher = typeof cacher
