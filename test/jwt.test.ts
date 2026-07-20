import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import { generateKeyPairSync } from 'node:crypto'

describe('jwt access/refresh (RS256)', () => {
  before(async () => {
    const { config } = await import('../src/config.js')
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    config.jwt_private_key = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    config.jwt_public_key = publicKey.export({ type: 'spki', format: 'pem' }).toString()
  })

  it('should sign and verify access token', async () => {
    const { jwt } = await import('../src/jwt.js')

    const token = await jwt.signAccessToken({ uid: 'u1', roles: ['admin'] })
    const payload = await jwt.verifyAccessToken<{ uid: string; type: string }>(token)

    assert.strictEqual(payload.uid, 'u1')
    assert.strictEqual(payload.type, 'access')
  })

  it('should sign refresh token with jti and reject cross-type verification', async () => {
    const { jwt } = await import('../src/jwt.js')

    const { token, jti } = await jwt.signRefreshToken('u2')
    const payload = await jwt.verifyRefreshToken(token)

    assert.strictEqual(payload.uid, 'u2')
    assert.strictEqual(payload.jti, jti)

    // A refresh token must never pass as an access token
    await assert.rejects(jwt.verifyAccessToken(token), /Invalid token type/)
  })
})

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

  it('should set expiration by default', async () => {
    const { jwt } = await import('../src/jwt.js')

    const token = await jwt.sign({ data: 1 })
    const decoded = jwt.decode<{ exp: number; iat: number }>(token)

    assert.ok(decoded?.exp, 'token must have exp claim')
    // Default 30d — must not be the old 1000y forever-token
    assert.ok(decoded.exp - decoded.iat <= 31 * 24 * 3600)
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
