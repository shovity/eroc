import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'

describe('internal', () => {
  let internal: typeof import('../src/internal.js').internal
  let config: typeof import('../src/config.js').config

  before(async () => {
    internal = (await import('../src/internal.js')).internal
    config = (await import('../src/config.js')).config
    config.internal_hmac_secret = 'test-secret'
  })

  after(() => {
    config.internal_hmac_secret = ''
  })

  it('should sign and verify a request', () => {
    const method = 'POST'
    const path = '/user/in/verify'
    const headers = internal.headers({ method, path })

    assert.strictEqual(internal.verify({ method, path, headers }), config.service)
  })

  it('should reject a tampered path', () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/a' })
    assert.strictEqual(internal.verify({ method: 'GET', path: '/user/in/b', headers }), false)
  })

  it('should reject a tampered method', () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/a' })
    assert.strictEqual(internal.verify({ method: 'DELETE', path: '/user/in/a', headers }), false)
  })

  it('should reject a stale timestamp (replay window)', () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/a' })
    headers['x-internal-timestamp'] = String(Date.now() - internal.MAX_SKEW_MS - 1000)
    assert.strictEqual(internal.verify({ method: 'GET', path: '/user/in/a', headers }), false)
  })

  it('should reject missing headers', () => {
    assert.strictEqual(internal.verify({ method: 'GET', path: '/user/in/a', headers: {} }), false)
  })

  it('should fail-secure without a configured secret', () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/a' })
    config.internal_hmac_secret = ''
    assert.strictEqual(internal.verify({ method: 'GET', path: '/user/in/a', headers }), false)
    config.internal_hmac_secret = 'test-secret'
  })
})
