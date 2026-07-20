import type { RequestHandler } from 'express'
import { redis } from './redis.js'
import { createHash } from 'node:crypto'

function md5(str: string): string {
  return createHash('md5').update(str).digest('hex')
}

export const cacher = {
  middle(options: { expire?: number; prefix?: string } = {}): RequestHandler {
    const { expire = 172800, prefix = '' } = options
    return async (req, res, next) => {
      const key = `cacher:middle:${prefix}:${req.baseUrl}${req.path}:${md5(JSON.stringify(req.query))}`

      if (req.headers.cacher === 'disable') {
        res.setHeader('X-Cache', 'DISABLE')
        return next()
      }

      try {
        const cached = await redis.get(key)
        if (cached !== null) {
          res.setHeader('X-Cache', 'HIT')
          return res.json(cached)
        }
      } catch {
        /* Redis not available */
      }

      const originalJson = res.json.bind(res)

      res.json = (body: unknown) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.set(key, body, { EX: expire }).catch(() => {})
        }
        res.setHeader('X-Cache', 'MISS')
        return originalJson(body)
      }
      next()
    }
  },

  async invalidate(pattern: string): Promise<void> {
    // SCAN instead of KEYS — KEYS blocks the whole Redis server
    let cursor = '0'
    do {
      const [next, keys] = await redis.cmd<[string, string[]]>(
        'SCAN',
        cursor,
        'MATCH',
        `cacher:*${pattern}*`,
        'COUNT',
        '500',
      )
      cursor = next
      if (keys.length > 0) await Promise.all(keys.map((k) => redis.del(k)))
    } while (cursor !== '0')
  },
}

export type Cacher = typeof cacher
