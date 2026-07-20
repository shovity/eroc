// Unit test for the util module — pure helpers used across the framework.
// Run: pnpm run test core/modules/util.spec.js

const util = require('./util')

describe('util.intersect', () => {
  test('returns the first element of destination that also appears in target', () => {
    expect(util.intersect(['admin', 'user'], ['guest', 'user'])).toBe('user')
  })

  test('returns undefined when there is no overlap', () => {
    expect(util.intersect(['admin'], ['guest'])).toBeUndefined()
  })

  test('returns undefined when target is not an array (guards role checks)', () => {
    expect(util.intersect(undefined, ['admin'])).toBeUndefined()
    expect(util.intersect('admin', ['admin'])).toBeUndefined()
  })
})

describe('util.maskUri', () => {
  test('masks the password segment of a connection uri', () => {
    expect(util.maskUri('mongodb://user:secret@host:27017/db')).toBe('mongodb://user:***@host:27017/db')
  })

  test('leaves a uri without credentials untouched', () => {
    expect(util.maskUri('redis://host:6379')).toBe('redis://host:6379')
  })

  test('passes through empty / nullish values', () => {
    expect(util.maskUri('')).toBe('')
    expect(util.maskUri(undefined)).toBeUndefined()
  })
})

describe('util.deferred', () => {
  test('exposes resolve so the promise can be settled externally', async () => {
    const d = util.deferred()
    d.resolve('done')
    await expect(d).resolves.toBe('done')
  })

  test('exposes reject so the promise can be failed externally', async () => {
    const d = util.deferred()
    d.reject(new Error('boom'))
    await expect(d).rejects.toThrow('boom')
  })
})

describe('util.readble', () => {
  test('true for an existing path, false for a missing one', async () => {
    await expect(util.readble(__filename)).resolves.toBe(true)
    await expect(util.readble(`${__dirname}/__does_not_exist__`)).resolves.toBe(false)
  })

  test('false for a falsy path', async () => {
    await expect(util.readble('')).resolves.toBe(false)
  })
})

describe('util.sleep', () => {
  // Fake timers so the test does not actually wait.
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  test('resolves only after the given delay elapses', async () => {
    let settled = false
    const p = util.sleep(1000).then(() => (settled = true))

    await Promise.resolve()
    expect(settled).toBe(false)

    jest.advanceTimersByTime(1000)
    await p
    expect(settled).toBe(true)
  })
})

describe('util.throttle', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  test('runs the leading call immediately and suppresses calls within the window', () => {
    const fn = jest.fn()
    const t = util.throttle(200)

    t.execute(fn)
    t.execute(fn)
    t.execute(fn)

    expect(fn).toHaveBeenCalledTimes(1) // leading edge only
  })

  test('fires once more on the trailing edge when calls arrived during the lock', () => {
    const fn = jest.fn()
    const t = util.throttle(200)

    t.execute(fn) // leading
    t.execute(fn) // queued as trailing
    jest.advanceTimersByTime(200)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('does not fire a trailing call when trailing is disabled', () => {
    const fn = jest.fn()
    const t = util.throttle(200, false)

    t.execute(fn)
    t.execute(fn)
    jest.advanceTimersByTime(200)

    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('util.debounce', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  test('collapses a burst into a single trailing call with the last args', () => {
    const fn = jest.fn()
    const d = util.debounce(200)

    d.execute(fn, 'a')
    d.execute(fn, 'b')
    d.execute(fn, 'c')

    jest.advanceTimersByTime(199)
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })
})
