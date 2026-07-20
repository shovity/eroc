// Unit test for the health module — readiness aggregation across configured dependencies.
// Run: pnpm run test core/modules/health.spec.js

global.check = (condition, message) => {
  if (!condition) {
    const error = new Error()
    typeof message === 'string' ? (error.message = message) : Object.assign(error, message)
    throw error
  }
}

// Mutable mocks so each test can drive dependency state.
const mockConfig = { service: 'test', env: 'test', mongo_uri: 'mongodb://x', redis_uri: 'redis://x' }
jest.mock('./config', () => mockConfig)

const mockMongoose = { connection: { readyState: 1 } }
jest.mock('mongoose', () => mockMongoose)

const mockRedis = { client: { isReady: true } }
jest.mock('./redis', () => mockRedis)

const health = require('./health')

beforeEach(() => {
  // Reset shared state between tests.
  health.checks = {}
  mockConfig.mongo_uri = 'mongodb://x'
  mockConfig.redis_uri = 'redis://x'
  mockMongoose.connection.readyState = 1
  mockRedis.client.isReady = true
})

describe('health.ready', () => {
  test('ready when every configured dependency is up', async () => {
    const { ready, checks } = await health.ready()

    expect(ready).toBe(true)
    expect(checks.mongo).toEqual({ ok: true, state: 'connected' })
    expect(checks.redis).toEqual({ ok: true })
  })

  test('not ready when mongo is not connected', async () => {
    mockMongoose.connection.readyState = 2 // connecting

    const { ready, checks } = await health.ready()

    expect(ready).toBe(false)
    expect(checks.mongo).toEqual({ ok: false, state: 'connecting' })
    expect(checks.redis.ok).toBe(true)
  })

  test('not ready when redis is not ready', async () => {
    mockRedis.client.isReady = false

    const { ready, checks } = await health.ready()

    expect(ready).toBe(false)
    expect(checks.redis).toEqual({ ok: false })
  })

  test('a custom check that throws is treated as not-ok, never crashes the probe', async () => {
    health.register('boom', async () => {
      throw new Error('dependency exploded')
    })

    const { ready, checks } = await health.ready()

    expect(ready).toBe(false)
    expect(checks.boom).toEqual({ ok: false, error: 'dependency exploded' })
  })

  test('a passing custom check is folded into the aggregate', async () => {
    health.register('queue', async () => ({ ok: true, depth: 0 }))

    const { ready, checks } = await health.ready()

    expect(ready).toBe(true)
    expect(checks.queue).toEqual({ ok: true, depth: 0 })
  })
})

describe('health.builtins', () => {
  test('skips dependencies the service does not configure', () => {
    mockConfig.mongo_uri = ''
    mockConfig.redis_uri = ''

    expect(Object.keys(health.builtins())).toEqual([])
  })

  test('Kafka is never a built-in readiness check', () => {
    expect(Object.keys(health.builtins())).not.toContain('kafka')
  })
})

describe('health.register', () => {
  test('rejects a non-function check', () => {
    expect(() => health.register('bad', 'not-a-fn')).toThrow()
  })
})
