// Unit test for the rio module — request/response helpers installed as middleware:
// req.gp() param parsing/validation, res.success() shaping + pagination, req.auth
// authorization, and CORS. These power every router, so the branches matter.
// Run: pnpm run test core/modules/rio.spec.js

const EventEmitter = require('node:events')

global.check = (condition, message) => {
  if (!condition) {
    const error = new Error()
    typeof message === 'string' ? (error.message = message) : Object.assign(error, message)
    throw error
  }
}

// Mutable config so the CORS tests can drive the allow-list.
const mockConfig = { rio_validator: {}, env: 'test', cors_origin: '' }
jest.mock('./config', () => mockConfig)

const rio = require('./rio')

// Build a fake express req/res pair with the event bus rio.util() would attach.
const makeCtx = ({ body = {}, query = {}, params = {}, originalUrl = '/test', headers = {} } = {}) => {
  const req = { body, query, params, originalUrl, headers, method: 'GET' }
  const res = {
    statusCode: null,
    jsonBody: undefined,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(b) {
      this.jsonBody = b
      return this
    },
    setHeader(k, v) {
      this.headers[k] = v
    },
    header(k, v) {
      this.headers[k] = v
    },
  }
  req.u = new EventEmitter()
  res.u = req.u
  const next = jest.fn()
  return { req, res, next }
}

describe('rio.base — req.gp', () => {
  const gpOf = (ctxOpts) => {
    const { req, res, next } = makeCtx(ctxOpts)
    rio.base()(req, res, next)
    return req.gp
  }

  test('resolves params with body > query > params precedence', () => {
    const gp = gpOf({ body: { x: 'body' }, query: { x: 'query' }, params: { x: 'param' } })
    expect(gp('x')).toBe('body')
  })

  test('falls back to query then params when earlier sources are absent', () => {
    expect(gpOf({ query: { x: 'query' } })('x')).toBe('query')
    expect(gpOf({ params: { x: 'param' } })('x')).toBe('param')
  })

  test('throws missing_param for a required param with no value and no default', () => {
    expect(() => gpOf({})('missing')).toThrow('Missing param: missing code:missing_param')
  })

  test('returns the default verbatim when the param is absent', () => {
    expect(gpOf({})('age', 18)).toBe(18)
  })

  test('regex validator: passes a match, rejects a non-match', () => {
    expect(gpOf({ query: { code: 'AB12' } })('code', undefined, /^[A-Z]{2}\d{2}$/)).toBe('AB12')
    expect(() => gpOf({ query: { code: 'xx' } })('code', undefined, /^[A-Z]{2}\d{2}$/)).toThrow('Invalid param code')
  })

  test('enum (array) validator: accepts a listed value, rejects an unlisted one', () => {
    const accept = ['active', 'inactive']
    expect(gpOf({ query: { status: 'active' } })('status', undefined, accept)).toBe('active')
    expect(() => gpOf({ query: { status: 'banned' } })('status', undefined, accept)).toThrow('Invalid param status')
  })

  test('function validator: uses the converted return value', () => {
    const gp = gpOf({ query: { n: '7' } })
    expect(gp('n', undefined, (v) => Number(v) * 2)).toBe(14)
  })

  test('named "number" validator coerces and rejects NaN', () => {
    expect(gpOf({ query: { n: '42' } })('n', undefined, 'number')).toBe(42)
    expect(() => gpOf({ query: { n: 'abc' } })('n', undefined, 'number')).toThrow('Invalid number: n')
  })

  test('named "comma" validator splits, trims and drops empties', () => {
    expect(gpOf({ query: { ids: 'a, b ,, c' } })('ids', undefined, 'comma')).toEqual(['a', 'b', 'c'])
  })

  test('named "date" validator rejects an invalid date', () => {
    expect(() => gpOf({ query: { d: 'not-a-date' } })('d', undefined, 'date')).toThrow('Invalid date: d')
  })

  test('unknown named validator throws', () => {
    expect(() => gpOf({ query: { x: 'v' } })('x', undefined, 'nope')).toThrow('Rio validator not found: nope')
  })
})

describe('rio.base — res.success', () => {
  test('wraps the payload under { data } with a 200 status and emits the success event', () => {
    const { req, res, next } = makeCtx()
    rio.base()(req, res, next)

    const seen = jest.fn()
    req.u.on('response_success', seen)

    res.success({ id: 1 })

    expect(res.statusCode).toBe(200)
    expect(res.jsonBody).toEqual({ data: { id: 1 } })
    expect(seen).toHaveBeenCalledWith({ data: { id: 1 } })
  })

  test('honours option.meta and option.code', () => {
    const { req, res, next } = makeCtx()
    rio.base()(req, res, next)

    res.success({ id: 1 }, { meta: { total: 9 }, code: 201 })

    expect(res.statusCode).toBe(201)
    expect(res.jsonBody).toEqual({ meta: { total: 9 }, data: { id: 1 } })
  })

  test('builds meta.next when a limit is present and the page is full', () => {
    const { req, res, next } = makeCtx({ query: { limit: '2' }, originalUrl: '/test?limit=2' })
    rio.base()(req, res, next)

    res.success([1, 2])

    expect(res.jsonBody.meta.next).toBe('/test?limit=2&offset=2')
  })

  test('leaves meta.next empty on a partial (last) page', () => {
    const { req, res, next } = makeCtx({ query: { limit: '5' }, originalUrl: '/test?limit=5' })
    rio.base()(req, res, next)

    res.success([1, 2])

    expect(res.jsonBody.meta.next).toBe('')
  })
})

describe('rio.base — res.error', () => {
  test('throws with the given message', () => {
    const { req, res, next } = makeCtx()
    rio.base()(req, res, next)

    expect(() => res.error('boom')).toThrow('boom')
  })
})

describe('rio.auth', () => {
  const authCtx = (user) => {
    const { req, res, next } = makeCtx()
    if (user !== undefined) req.u.user = user
    rio.auth()(req, res, next)
    return req.auth
  }

  test('login() throws when there is no authenticated user', async () => {
    await expect(authCtx(undefined).login()).rejects.toThrow('Require login')
  })

  test('login() resolves when a user is present', async () => {
    await expect(authCtx({ roles: ['user'] }).login()).resolves.toBeUndefined()
  })

  test('role() passes when the user holds one of the accepted roles', async () => {
    await expect(authCtx({ roles: ['admin'] }).role('admin moderator')).resolves.toBeUndefined()
  })

  test('role() throws insufficient_permission when the user lacks every role', async () => {
    await expect(authCtx({ roles: ['user'] }).role('admin')).rejects.toThrow('insufficient_permission')
  })

  test('role(role, false) reports without throwing', async () => {
    await expect(authCtx({ roles: ['admin'] }).role('admin', false)).resolves.toBe('admin')
    await expect(authCtx({ roles: ['user'] }).role('admin', false)).resolves.toBeUndefined()
  })
})

describe('rio.cors', () => {
  afterEach(() => {
    mockConfig.cors_origin = ''
  })

  test('does nothing and continues when no origin is configured', () => {
    const { req, res, next } = makeCtx()
    rio.cors()(req, res, next)

    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  test('wildcard origin echoes "*"', () => {
    mockConfig.cors_origin = '*'
    const { req, res, next } = makeCtx({ headers: { origin: 'https://app.example' } })
    rio.cors()(req, res, next)

    expect(res.headers['Access-Control-Allow-Origin']).toBe('*')
    expect(next).toHaveBeenCalled()
  })

  test('reflects an allow-listed origin and omits a non-listed one', () => {
    mockConfig.cors_origin = 'https://a.example,https://b.example'

    const allowed = makeCtx({ headers: { origin: 'https://a.example' } })
    rio.cors()(allowed.req, allowed.res, allowed.next)
    expect(allowed.res.headers['Access-Control-Allow-Origin']).toBe('https://a.example')

    const denied = makeCtx({ headers: { origin: 'https://evil.example' } })
    rio.cors()(denied.req, denied.res, denied.next)
    expect(denied.res.headers['Access-Control-Allow-Origin']).toBeUndefined()
    expect(denied.next).toHaveBeenCalled() // still continues, just without the header
  })
})
