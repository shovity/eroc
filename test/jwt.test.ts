import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('jwt', () => {
  it('should sign and verify token', async () => {
    const { jwt } = await import('../src/jwt.js')

    const payload = { userId: 123, role: 'admin' }
    const token = await jwt.sign(payload)

    assert.ok(typeof token === 'string')
    assert.ok(token.split('.').length === 3)

    const decoded = await jwt.verify<typeof payload>(token)
    assert.strictEqual(decoded.userId, 123)
    assert.strictEqual(decoded.role, 'admin')
  })

  it('should use custom secret', async () => {
    const { jwt } = await import('../src/jwt.js')

    const token = await jwt.sign({ data: 1 }, { secret: 'custom-secret' })
    const decoded = await jwt.verify(token, { secret: 'custom-secret' })
    assert.strictEqual(decoded.data, 1)

    await assert.rejects(jwt.verify(token, { secret: 'wrong-secret' }), /signature/i)
  })

  it('should decode without verification', async () => {
    const { jwt } = await import('../src/jwt.js')

    const token = await jwt.sign({ foo: 'bar' })
    const decoded = jwt.decode<{ foo: string }>(token)

    assert.strictEqual(decoded?.foo, 'bar')
  })

  it('should return null for invalid token decode', async () => {
    const { jwt } = await import('../src/jwt.js')

    const decoded = jwt.decode('invalid-token')
    assert.strictEqual(decoded, null)
  })
})
