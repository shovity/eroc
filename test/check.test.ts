import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('check', () => {
  it('should not throw on truthy condition', async () => {
    const { check } = await import('../src/check.js')
    assert.doesNotThrow(() => check(true, 'error'))
    assert.doesNotThrow(() => check(1, 'error'))
    assert.doesNotThrow(() => check({}, 'error'))
    assert.doesNotThrow(() => check('str', 'error'))
  })

  it('should throw on falsy condition with string message', async () => {
    const { check } = await import('../src/check.js')
    assert.throws(() => check(false, 'error message'), { message: 'error message' })
    assert.throws(() => check(null, 'null error'))
    assert.throws(() => check(undefined, 'undefined error'))
    assert.throws(() => check(0, 'zero error'))
    assert.throws(() => check('', 'empty string error'))
  })

  it('should throw with object properties', async () => {
    const { check } = await import('../src/check.js')
    try {
      check(false, { message: 'custom', code: 'ERR_001', status: 400 })
      assert.fail('should have thrown')
    } catch (err) {
      const error = err as Error & { code: string; status: number }
      assert.strictEqual(error.message, 'custom')
      assert.strictEqual(error.code, 'ERR_001')
      assert.strictEqual(error.status, 400)
    }
  })
})

describe('is', () => {
  it('should return true for non-nullish values', async () => {
    const { is } = await import('../src/check.js')
    assert.strictEqual(is(1), true)
    assert.strictEqual(is(''), true)
    assert.strictEqual(is(0), true)
    assert.strictEqual(is(false), true)
    assert.strictEqual(is({}), true)
    assert.strictEqual(is([]), true)
  })

  it('should return false for nullish values', async () => {
    const { is } = await import('../src/check.js')
    assert.strictEqual(is(null), false)
    assert.strictEqual(is(undefined), false)
  })
})

describe('checkWith', () => {
  it('should throw custom error class', async () => {
    const { checkWith } = await import('../src/check.js')

    class CustomError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'CustomError'
      }
    }

    assert.throws(
      () => checkWith(CustomError, false, 'custom error'),
      (err: Error) => err instanceof CustomError && err.message === 'custom error',
    )
  })

  it('should not throw on truthy condition', async () => {
    const { checkWith } = await import('../src/check.js')
    class CustomError extends Error {}
    assert.doesNotThrow(() => checkWith(CustomError, true, 'error'))
  })
})
