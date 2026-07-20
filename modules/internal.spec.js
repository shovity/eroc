// Unit test for inter-service HMAC signing/verification (internal module).
// Run: pnpm run test core/modules/internal.spec.js

// Mock config to control the shared secret and sender identity.
const mockConfig = { internal_hmac_secret: 'super-internal-secret', service: 'user' }
jest.mock('./config', () => mockConfig)

const internal = require('./internal')

const buildReq = (headers, overrides = {}) => ({
  method: 'GET',
  path: '/user/in/verify',
  headers,
  ...overrides,
})

describe('internal.headers + internal.verify', () => {
  test('round trip: signed headers verify and return sender', () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/verify' })

    expect(headers[internal.HEADER.sender]).toBe('user')
    expect(headers[internal.HEADER.signature]).toMatch(/^[0-9a-f]{64}$/)

    expect(internal.verify(buildReq(headers))).toBe('user')
  })

  test('rejects when signature headers are missing', () => {
    expect(internal.verify(buildReq({}))).toBe(false)
  })

  test('rejects a tampered signature', () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/verify' })
    headers[internal.HEADER.signature] = 'deadbeef'.repeat(8)

    expect(internal.verify(buildReq(headers))).toBe(false)
  })

  test('rejects when the method does not match the signature', () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/verify' })

    expect(internal.verify(buildReq(headers, { method: 'POST' }))).toBe(false)
  })

  test('rejects when the path does not match the signature', () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/verify' })

    expect(internal.verify(buildReq(headers, { path: '/user/in/admin' }))).toBe(false)
  })

  test('rejects a signature signed with a different secret', () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/verify' })
    mockConfig.internal_hmac_secret = 'rotated-secret'

    expect(internal.verify(buildReq(headers))).toBe(false)
    mockConfig.internal_hmac_secret = 'super-internal-secret'
  })

  test('rejects a stale timestamp beyond the skew window (replay protection)', () => {
    const sender = 'user'
    const method = 'GET'
    const path = '/user/in/verify'
    const timestamp = Date.now() - (internal.MAX_SKEW_MS + 10_000)
    const signature = internal._sign({ method, path, timestamp, sender })

    const headers = {
      [internal.HEADER.sender]: sender,
      [internal.HEADER.timestamp]: String(timestamp),
      [internal.HEADER.signature]: signature,
    }

    expect(internal.verify(buildReq(headers))).toBe(false)
  })
})
