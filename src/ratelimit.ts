import { randomUUID } from 'node:crypto'
import type { Request } from 'express'
import { redis } from './redis.js'
import { logger } from './logger.js'
import { check } from './check.js'

interface ConsumeOptions {
  req: Request
  key?: string
  max?: number
  window?: number // seconds
  prefix?: string
  message?: string
}

export const ratelimit = {
  /**
   * Resolve the real client IP. Services often run behind a reverse proxy
   * without `trust proxy`, so read X-Forwarded-For first.
   */
  getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown'
  },

  /** Stable namespace from the matched route, e.g. "POST:/user/login" */
  getRoutePrefix(req: Request): string {
    const path = req.route?.path ?? req.path ?? ''
    return `${req.method}:${req.baseUrl || ''}${path}`
  },

  /**
   * Consume one request slot — sliding-window backed by a Redis sorted set.
   * Call at the top of a route handler; throws a 429 error when exceeded.
   */
  async consume({
    req,
    key,
    max = 60,
    window = 60,
    prefix,
    message = 'Too many requests',
  }: ConsumeOptions): Promise<{ limited: boolean; remaining: number; count?: number }> {
    check(req, 'ratelimit: req (Express request) is required')
    check(max > 0, 'ratelimit: max must be a positive number')
    check(window > 0, 'ratelimit: window must be a positive number (seconds)')

    const res = req.res
    const namespace = prefix ?? ratelimit.getRoutePrefix(req)
    const id = key ?? ratelimit.getClientIp(req)
    const redisKey = `ratelimit:${namespace}:${id}`
    const now = Date.now()
    const windowMs = window * 1000

    let count: number

    try {
      const client = await redis.getClient()
      const results = await client
        .multi()
        .zRemRangeByScore(redisKey, 0, now - windowMs) // drop entries older than the window
        .zAdd(redisKey, { score: now, value: `${now}:${randomUUID()}` }) // record current hit
        .zCard(redisKey) // count hits within the window
        .pExpire(redisKey, windowMs) // let the key self-expire
        .exec()

      count = Number(results[2])
    } catch (error) {
      // Fail-open: never block users when Redis is unavailable
      logger.error('ratelimit: error', { error: String(error) })
      return { limited: false, remaining: max }
    }

    const remaining = Math.max(0, max - count)

    if (res) {
      res.append('X-RateLimit-Limit', String(max))
      res.append('X-RateLimit-Remaining', String(remaining))
    }

    if (count > max) {
      if (res) {
        res.status(429)
        res.append('Retry-After', String(window))
      }
      check(false, message)
    }

    return { limited: false, remaining, count }
  },
}

export type Ratelimit = typeof ratelimit
