import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('request', () => {
  it('should have all HTTP methods', async () => {
    const { request } = await import('../src/request.js')

    assert.ok(typeof request.get === 'function')
    assert.ok(typeof request.post === 'function')
    assert.ok(typeof request.put === 'function')
    assert.ok(typeof request.patch === 'function')
    assert.ok(typeof request.delete === 'function')
  })
})
