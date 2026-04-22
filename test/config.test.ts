import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('config', () => {
  it('should have default values', async () => {
    const { config } = await import('../src/config.js')

    assert.strictEqual(config.port, 3000)
    assert.strictEqual(config.env, 'local')
    assert.strictEqual(config.secret, 'terces')
    assert.strictEqual(config.cors_origin, '*')
  })

  it('should have deferred promises', async () => {
    const { deferred } = await import('../src/config.js')

    assert.ok(deferred.config)
    assert.ok(deferred.setup)
    assert.ok(typeof deferred.config.resolve === 'function')
    assert.ok(typeof deferred.setup.resolve === 'function')
  })

  it('should validate with configSchema', async () => {
    const { configSchema } = await import('../src/config.js')

    const result = configSchema.safeParse({
      service: 'test-service',
      port: 8080,
      env: 'prod',
    })

    assert.ok(result.success)
    if (result.success) {
      assert.strictEqual(result.data.service, 'test-service')
      assert.strictEqual(result.data.port, 8080)
      assert.strictEqual(result.data.env, 'prod')
    }
  })

  it('should reject invalid env', async () => {
    const { configSchema } = await import('../src/config.js')

    const result = configSchema.safeParse({
      service: 'test',
      env: 'invalid',
    })

    assert.strictEqual(result.success, false)
  })
})
