import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { Request, Response } from 'express'

async function makeReq(overrides: Partial<{ body: object; query: object; params: object }> = {}): Promise<Request> {
  const { rio } = await import('../src/rio.js')
  const req = {
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    params: overrides.params ?? {},
  } as unknown as Request
  const res = {} as Response

  await new Promise<void>((resolve) => rio.base()(req, res, () => resolve()))
  return req
}

describe('rio.gp', () => {
  it('should read param from body, query, params in priority order', async () => {
    const req = await makeReq({ body: { a: 'body' }, query: { a: 'query', b: 'query' }, params: { b: 'params', c: 'params' } })

    assert.strictEqual(req.gp('a'), 'body')
    assert.strictEqual(req.gp('b'), 'query')
    assert.strictEqual(req.gp('c'), 'params')
  })

  it('should throw on missing param without default', async () => {
    const req = await makeReq()
    assert.throws(() => req.gp('missing'), /Missing param: missing/)
  })

  it('should return default for missing param', async () => {
    const req = await makeReq()
    assert.strictEqual(req.gp('missing', 42), 42)
  })

  it('should validate with RegExp', async () => {
    const req = await makeReq({ body: { phone: '0912345678' } })

    assert.strictEqual(req.gp('phone', undefined, /^09\d{8}$/), '0912345678')
    assert.throws(() => req.gp('phone', undefined, /^08\d{8}$/), /Invalid param phone/)
  })

  it('should validate with enum array', async () => {
    const req = await makeReq({ query: { sort: 'asc' } })

    assert.strictEqual(req.gp('sort', undefined, ['asc', 'desc']), 'asc')
    assert.throws(() => req.gp('sort', undefined, ['up', 'down']), /Invalid param sort/)
  })

  it('should convert with named validators', async () => {
    const req = await makeReq({ body: { n: '15', list: 'a, b,, c' } })

    assert.strictEqual(req.gp('n', undefined, 'number'), 15)
    assert.deepStrictEqual(req.gp('list', undefined, 'comma'), ['a', 'b', 'c'])
    assert.throws(() => req.gp('list', undefined, 'number'), /Invalid number/)
  })

  it('should convert with a function validator', async () => {
    const req = await makeReq({ body: { n: '7' } })
    assert.strictEqual(
      req.gp('n', undefined, (v: unknown) => Number(v) * 2),
      14,
    )
  })
})
