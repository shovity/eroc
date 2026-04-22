import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('util.sleep', () => {
  it('should wait for specified milliseconds', async () => {
    const { util } = await import('../src/util.js')
    const start = Date.now()
    await util.sleep(50)
    const elapsed = Date.now() - start
    assert.ok(elapsed >= 45, `Expected at least 45ms, got ${elapsed}ms`)
  })
})

describe('util.deferred', () => {
  it('should create PromiseWithResolvers', async () => {
    const { util } = await import('../src/util.js')
    const d = util.deferred<number>()

    assert.ok('promise' in d)
    assert.ok('resolve' in d)
    assert.ok('reject' in d)

    setTimeout(() => d.resolve(42), 10)
    const result = await d.promise
    assert.strictEqual(result, 42)
  })

  it('should reject correctly', async () => {
    const { util } = await import('../src/util.js')
    const d = util.deferred<number>()

    setTimeout(() => d.reject(new Error('test error')), 10)
    await assert.rejects(d.promise, { message: 'test error' })
  })
})

describe('util.throttle', () => {
  it('should throttle function calls', async () => {
    const { util } = await import('../src/util.js')
    let callCount = 0
    const fn = () => {
      callCount++
    }
    const throttled = util.throttle(fn, 50)

    throttled()
    throttled()
    throttled()

    assert.strictEqual(callCount, 1)

    await util.sleep(60)
    throttled()
    assert.strictEqual(callCount, 2)
  })
})

describe('util.debounce', () => {
  it('should debounce function calls', async () => {
    const { util } = await import('../src/util.js')
    let callCount = 0
    const fn = () => {
      callCount++
    }
    const debounced = util.debounce(fn, 30)

    debounced()
    debounced()
    debounced()

    assert.strictEqual(callCount, 0)

    await util.sleep(50)
    assert.strictEqual(callCount, 1)
  })
})

describe('util.intersect', () => {
  it('should copy only existing keys from source to target', async () => {
    const { util } = await import('../src/util.js')
    const target = { a: 1, b: 2, c: 3 }
    const source = { a: 10, d: 40 }

    const result = util.intersect(target, source)

    assert.deepStrictEqual(result, { a: 10, b: 2, c: 3 })
  })
})
