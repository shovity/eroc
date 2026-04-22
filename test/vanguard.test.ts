import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('vanguard', () => {
  it('should detect token from Authorization header', async () => {
    const { vanguard } = await import('../src/vanguard.js')
    const { jwt } = await import('../src/jwt.js')

    const token = await jwt.sign({ uid: '123' })
    const middleware = vanguard.detect()

    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
    } as any
    const res = {} as any

    await new Promise<void>((resolve) => {
      middleware(req, res, () => {
        resolve()
      })
    })

    assert.strictEqual(req.auth?.uid, '123')
  })

  it('should detect token from cookie', async () => {
    const { vanguard } = await import('../src/vanguard.js')
    const { jwt } = await import('../src/jwt.js')

    const token = await jwt.sign({ uid: '456' })
    const middleware = vanguard.detect()

    const req = {
      headers: {},
      cookies: { token },
    } as any
    const res = {} as any

    await new Promise<void>((resolve) => {
      middleware(req, res, () => resolve())
    })

    assert.strictEqual(req.auth?.uid, '456')
  })

  it('should have supervisor tiat', async () => {
    const { vanguard } = await import('../src/vanguard.js')

    assert.ok(vanguard.supervisors.tiat)

    const middleware = vanguard.supervisors.tiat()

    // Without auth - should return 401
    const req1 = { auth: undefined } as any
    let statusCode = 0
    const res1 = {
      status: (code: number) => {
        statusCode = code
        return { json: () => {} }
      },
    } as any

    middleware(req1, res1, () => assert.fail('should not call next'))
    assert.strictEqual(statusCode, 401)
  })
})
