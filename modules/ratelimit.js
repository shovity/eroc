const crypto = require('node:crypto')
const redis = require('./redis')
const logger = require('./logger')

const ratelimit = {}

/**
 * Resolve the real client IP.
 * Services run behind Traefik and cardinal does not enable `trust proxy`,
 * so `req.ip` is Traefik's internal address — read X-Forwarded-For instead.
 */
ratelimit.getClientIp = (req) => {
  const forwarded = req.headers?.['x-forwarded-for']

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return req.ip || req.socket?.remoteAddress || 'unknown'
}

/**
 * Derive a stable namespace from the matched route, e.g. "POST:/user/login".
 * Uses req.route.path (the route pattern, e.g. "/:id") so dynamic params don't fragment counters.
 */
ratelimit.getRoutePrefix = (req) => {
  const path = req.route?.path ?? req.path ?? ''
  return `${req.method}:${req.baseUrl || ''}${path}`
}

/**
 * Consume one request slot for the caller, sliding-window algorithm backed by a Redis sorted set.
 * Call it at the top of a route handler — it throws a 429 error when the limit is exceeded.
 *
 * @param {Object} option
 * @param {Object} option.req - Express request (req.res is used to set status/headers)
 * @param {string} [option.key] - Identifier to rate limit on; defaults to the client IP
 * @param {number} [option.max=60] - Max requests allowed within the window
 * @param {number} [option.window=60] - Window length in seconds
 * @param {string} [option.prefix] - Namespace to isolate counters; defaults to "{method}:{path}" of the route
 * @param {string} [option.message='Too many requests'] - Error message when limited
 * @returns {Promise<{ limited: boolean, remaining: number, count?: number }>}
 */
ratelimit.consume = async ({ req, key, max = 60, window = 60, prefix, message = 'Too many requests' }) => {
  // Validate params — fail fast on programmer misuse
  check(req, 'ratelimit: req (Express request) is required')
  check(key === undefined || typeof key === 'string', 'ratelimit: key must be a string when provided')
  check(typeof max === 'number' && max > 0, 'ratelimit: max must be a positive number')
  check(typeof window === 'number' && window > 0, 'ratelimit: window must be a positive number (seconds)')
  check(
    prefix === undefined || (typeof prefix === 'string' && prefix),
    'ratelimit: prefix must be a non-empty string when provided',
  )

  const res = req.res
  const namespace = prefix ?? ratelimit.getRoutePrefix(req)
  const id = key ?? ratelimit.getClientIp(req)
  const redisKey = `ratelimit:${namespace}:${id}`
  const now = Date.now()
  const windowMs = window * 1000

  let count

  try {
    const results = await redis.client
      .multi()
      .zRemRangeByScore(redisKey, 0, now - windowMs) // drop entries older than the window
      .zAdd(redisKey, { score: now, value: `${now}:${crypto.randomUUID()}` }) // record current hit
      .zCard(redisKey) // count hits within the window
      .pExpire(redisKey, windowMs) // let the key self-expire
      .exec()

    count = results[2]
  } catch (error) {
    // Fail-open: never block users when Redis is unavailable
    logger.error('ratelimit error', error)
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

    check(false, `${message} code:rate_limit_exceeded`)
  }

  return { limited: false, remaining, count }
}

module.exports = ratelimit
