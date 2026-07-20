// Unit test cho jwt module — RS256 (F-07). Ký bằng private key, verify bằng public key.
// Chạy: pnpm run test core/modules/jwt.spec.js

const jose = require('jose')

// Mock config; keypair được nạp trong beforeAll trước khi require('./jwt').
const mockConfig = {
  jwt_private_key: '',
  jwt_public_key: '',
  access_token_expires: '15m',
  refresh_token_expires: '7d',
}
jest.mock('./config', () => mockConfig)

let jwt

beforeAll(async () => {
  const { privateKey, publicKey } = await jose.generateKeyPair('RS256')
  mockConfig.jwt_private_key = await jose.exportPKCS8(privateKey)
  mockConfig.jwt_public_key = await jose.exportSPKI(publicKey)
  jwt = require('./jwt')
})

describe('jwt RS256', () => {
  test('signAccessToken + verifyAccessToken round-trip', async () => {
    const token = await jwt.signAccessToken({ uid: 'u1', role: 'admin' })
    const payload = await jwt.verifyAccessToken(token)

    expect(payload.uid).toBe('u1')
    expect(payload.role).toBe('admin')
    expect(payload.type).toBe('access')
  })

  test('signRefreshToken trả {token, jti} và verify được', async () => {
    const { token, jti } = await jwt.signRefreshToken('u1')

    expect(typeof token).toBe('string')
    expect(jti).toBeDefined()

    const payload = await jwt.verifyRefreshToken(token)
    expect(payload.type).toBe('refresh')
    expect(payload.uid).toBe('u1')
    expect(payload.jti).toBe(jti)
  })

  test('verifyAccessToken từ chối refresh token (sai type)', async () => {
    const { token } = await jwt.signRefreshToken('u1')
    await expect(jwt.verifyAccessToken(token)).rejects.toThrow('Invalid token type')
  })

  test('verifyRefreshToken từ chối access token (sai type)', async () => {
    const token = await jwt.signAccessToken({ uid: 'u1' })
    await expect(jwt.verifyRefreshToken(token)).rejects.toThrow('Invalid token type')
  })

  test('từ chối token ký bằng keypair khác', async () => {
    const other = await jose.generateKeyPair('RS256')
    const bad = await new jose.SignJWT({ type: 'access' })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(other.privateKey)

    await expect(jwt.verifyAccessToken(bad)).rejects.toThrow()
  })

  test('chống algorithm-confusion: từ chối token HS256 ký bằng public key làm secret', async () => {
    const secret = new TextEncoder().encode(mockConfig.jwt_public_key)
    const hs = await new jose.SignJWT({ type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret)

    await expect(jwt.verifyAccessToken(hs)).rejects.toThrow()
  })
})
