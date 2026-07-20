// Unit test cho vanguard supervisor "internal" — bảo vệ route /:service/in/* (F-04).
// Chạy: pnpm run test core/modules/vanguard.spec.js

// Mock config: internal auth dùng HMAC ký request (config.internal_hmac_secret).
const mockConfig = {
  vanguard_supervisor: 'internal',
  internal_hmac_secret: 'super-internal-secret',
  service: 'user',
}
jest.mock('./config', () => mockConfig)

// check là global do core/index.js định nghĩa; nạp lại để dùng trong test.
global.check = (condition, message) => {
  if (!condition) {
    const error = new Error()
    typeof message === 'string' ? (error.message = message) : Object.assign(error, message)
    throw error
  }
}

const vanguard = require('./vanguard')
const internal = require('./internal')

// Đẩy 1 request giả qua router middleware, resolve về error mà next() nhận (undefined = pass).
function run(router, { url, headers = {} }) {
  return new Promise((resolve) => {
    router({ method: 'GET', url, headers }, {}, (err) => resolve(err))
  })
}

describe('vanguard.supervisor.internal', () => {
  beforeEach(() => {
    mockConfig.internal_hmac_secret = 'super-internal-secret'
    mockConfig.service = 'user'
  })

  test('cho qua /in/* khi chữ ký HMAC hợp lệ', async () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/admin' })
    const err = await run(vanguard.supervisor.internal(), { url: '/user/in/admin', headers })
    expect(err).toBeUndefined()
  })

  test('chặn /in/* khi thiếu chữ ký HMAC', async () => {
    const err = await run(vanguard.supervisor.internal(), { url: '/user/in/admin' })
    expect(err).toBeDefined()
    expect(err.message).toBe('Internal api access denied')
  })

  test('chặn /in/* khi chữ ký sai', async () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/admin' })
    headers[internal.HEADER.signature] = 'deadbeef'.repeat(8)
    const err = await run(vanguard.supervisor.internal(), { url: '/user/in/admin', headers })
    expect(err).toBeDefined()
    expect(err.message).toBe('Internal api access denied')
  })

  test('chặn /in/* khi chữ ký ký cho path khác (chống replay sang endpoint khác)', async () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/verify' })
    const err = await run(vanguard.supervisor.internal(), { url: '/user/in/admin', headers })
    expect(err).toBeDefined()
    expect(err.message).toBe('Internal api access denied')
  })

  test('fail-secure: chặn /in/* khi internal_hmac_secret chưa cấu hình', async () => {
    const headers = internal.headers({ method: 'GET', path: '/user/in/admin' })
    mockConfig.internal_hmac_secret = ''
    const err = await run(vanguard.supervisor.internal(), { url: '/user/in/admin', headers })
    expect(err).toBeDefined()
    expect(err.message).toBe('Internal api access denied')
  })

  test('không can thiệp route thường (không phải /in/*)', async () => {
    const err = await run(vanguard.supervisor.internal(), {
      url: '/user/profile',
      headers: {},
    })
    expect(err).toBeUndefined()
  })
})

describe('vanguard.supervise', () => {
  test('default-secure: supervisor "internal" được bật mặc định', async () => {
    // supervise() đọc config.vanguard_supervisor = 'internal' (mặc định mới) → router chặn /in/*.
    const err = await run(vanguard.supervise(), { url: '/user/in/admin' })
    expect(err).toBeDefined()
    expect(err.message).toBe('Internal api access denied')
  })
})
