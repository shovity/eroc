global.check = (condition, message) => {
  if (!condition) {
    const error = new Error()
    typeof message === 'string' ? (error.message = message) : Object.assign(error, message)
    throw error
  }
}

// Build a chainable redis.client.multi() mock whose exec() resolves to `execResult`.
// `chain` exposes the recorded method calls for assertions.
const makeMulti = () => {
  const chain = {
    calls: [],
    execResult: [null, null, 1, null], // default zCard (index 2) = 1
    exec: jest.fn(() => Promise.resolve(chain.execResult)),
  }

  for (const method of ['zRemRangeByScore', 'zAdd', 'zCard', 'pExpire']) {
    chain[method] = jest.fn((...args) => {
      chain.calls.push([method, ...args])
      return chain
    })
  }

  return chain
}

let multi

const mockRedis = {
  client: {
    multi: jest.fn(() => multi),
  },
}
const mockLogger = { error: jest.fn() }

jest.mock('./redis', () => mockRedis)
jest.mock('./logger', () => mockLogger)

const ratelimit = require('./ratelimit')

const makeReq = (overrides = {}) => {
  const res = {
    statusCode: 200,
    status: jest.fn(function (code) {
      this.statusCode = code
      return this
    }),
    append: jest.fn(),
  }

  return {
    method: 'POST',
    baseUrl: '/user',
    route: { path: '/login' },
    headers: {},
    ip: '10.0.0.1',
    socket: { remoteAddress: '10.0.0.9' },
    res,
    ...overrides,
  }
}

beforeEach(() => {
  multi = makeMulti()
  mockRedis.client.multi.mockClear()
  mockLogger.error.mockClear()
})

describe('ratelimit.getClientIp', () => {
  test('prefers the first IP from x-forwarded-for', () => {
    const req = makeReq({ headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18, 150.172.238.178' } })
    expect(ratelimit.getClientIp(req)).toBe('203.0.113.5')
  })

  test('falls back to req.ip when no forwarded header', () => {
    const req = makeReq()
    expect(ratelimit.getClientIp(req)).toBe('10.0.0.1')
  })

  test('falls back to socket address, then unknown', () => {
    expect(ratelimit.getClientIp({ headers: {}, socket: { remoteAddress: '10.0.0.9' } })).toBe('10.0.0.9')
    expect(ratelimit.getClientIp({ headers: {} })).toBe('unknown')
  })
})

describe('ratelimit.consume param validation', () => {
  test('throws when req is missing', async () => {
    await expect(ratelimit.consume({ prefix: 'test' })).rejects.toThrow('req (Express request) is required')
  })

  test('throws when key is not a string', async () => {
    await expect(ratelimit.consume({ req: makeReq(), key: 123 })).rejects.toThrow('key must be a string')
  })

  test('throws when max is not a positive number', async () => {
    await expect(ratelimit.consume({ req: makeReq(), max: 0 })).rejects.toThrow('max must be a positive number')
  })

  test('throws when window is not a positive number', async () => {
    await expect(ratelimit.consume({ req: makeReq(), window: -1 })).rejects.toThrow('window must be a positive number')
  })

  test('throws when prefix is empty', async () => {
    await expect(ratelimit.consume({ req: makeReq(), prefix: '' })).rejects.toThrow('prefix must be a non-empty string')
  })
})

describe('ratelimit.getRoutePrefix', () => {
  test('combines method, baseUrl and route pattern', () => {
    const req = { method: 'POST', baseUrl: '/user', route: { path: '/login' } }
    expect(ratelimit.getRoutePrefix(req)).toBe('POST:/user/login')
  })

  test('keeps the route pattern so dynamic params do not fragment the key', () => {
    const req = { method: 'GET', baseUrl: '/user', route: { path: '/:id' } }
    expect(ratelimit.getRoutePrefix(req)).toBe('GET:/user/:id')
  })
})

describe('ratelimit.consume', () => {
  test('under the limit: does not throw, sets rate-limit headers', async () => {
    multi.execResult = [null, null, 5, null] // count = 5
    const req = makeReq()

    const result = await ratelimit.consume({ req, prefix: 'test', max: 10, window: 60 })

    expect(result).toEqual({ limited: false, remaining: 5, count: 5 })
    expect(req.res.append).toHaveBeenCalledWith('X-RateLimit-Limit', '10')
    expect(req.res.append).toHaveBeenCalledWith('X-RateLimit-Remaining', '5')
    expect(req.res.status).not.toHaveBeenCalled()
  })

  test('over the limit: throws 429 with rate_limit_exceeded code and Retry-After', async () => {
    multi.execResult = [null, null, 11, null] // count = 11 > max 10
    const req = makeReq()

    await expect(ratelimit.consume({ req, prefix: 'test', max: 10, window: 60 })).rejects.toThrow('rate_limit_exceeded')

    expect(req.res.status).toHaveBeenCalledWith(429)
    expect(req.res.append).toHaveBeenCalledWith('Retry-After', '60')
    expect(req.res.append).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')
  })

  test('fail-open: Redis error is logged and the request is allowed', async () => {
    multi.exec.mockRejectedValueOnce(new Error('Redis down'))
    const req = makeReq()

    const result = await ratelimit.consume({ req, prefix: 'test', max: 10, window: 60 })

    expect(result).toEqual({ limited: false, remaining: 10 })
    expect(mockLogger.error).toHaveBeenCalledWith('ratelimit error', expect.any(Error))
    expect(req.res.status).not.toHaveBeenCalled()
  })

  test('uses the provided key for the redis key', async () => {
    const req = makeReq()

    await ratelimit.consume({ req, key: 'usr_123', prefix: 'test', max: 10, window: 60 })

    const zAddCall = multi.calls.find((c) => c[0] === 'zAdd')
    expect(zAddCall[1]).toBe('ratelimit:test:usr_123')
  })

  test('defaults to the client IP when no key is provided', async () => {
    const req = makeReq({ headers: { 'x-forwarded-for': '203.0.113.5' } })

    await ratelimit.consume({ req, prefix: 'test', max: 10, window: 60 })

    const zCardCall = multi.calls.find((c) => c[0] === 'zCard')
    expect(zCardCall[1]).toBe('ratelimit:test:203.0.113.5')
  })

  test('derives the namespace from the route when no prefix is provided', async () => {
    const req = makeReq({ method: 'POST', baseUrl: '/user', route: { path: '/login' }, ip: '1.2.3.4' })

    await ratelimit.consume({ req, max: 10, window: 60 })

    const zCardCall = multi.calls.find((c) => c[0] === 'zCard')
    expect(zCardCall[1]).toBe('ratelimit:POST:/user/login:1.2.3.4')
  })
})
