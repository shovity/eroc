// Unit test for the Router wrapper — its job is to make async route handlers
// safe by routing any rejection to Express's next(err), while leaving sync
// handlers and non-handler args (paths) untouched. Express is mocked so we can
// capture exactly what the underlying router receives.
// Run: pnpm run test core/modules/Router.spec.js

jest.mock('express', () => {
  const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'option', 'use', 'all']
  return {
    Router: jest.fn(() => {
      const r = {}
      METHODS.forEach((m) => (r[m] = jest.fn()))
      return r
    }),
  }
})

const Router = require('./Router')

// Register `handler` via `method`, then return the args the original (underscored)
// express method actually received — i.e. what the wrapper passed through.
const capture = (method, ...args) => {
  const router = Router()
  router[method](...args)
  return router[`_${method}`].mock.calls[0]
}

describe('Router async wrapping', () => {
  test('forwards a rejected async handler to next()', async () => {
    const err = new Error('handler blew up')
    const [, wrapped] = capture('get', '/p', async () => {
      throw err
    })

    const next = jest.fn()
    await wrapped({}, {}, next)

    expect(next).toHaveBeenCalledWith(err)
  })

  test('does not call next() when the async handler resolves', async () => {
    const [, wrapped] = capture('post', '/p', async () => 'ok')

    const next = jest.fn()
    await wrapped({}, {}, next)

    expect(next).not.toHaveBeenCalled()
  })

  test('passes a synchronous handler through unwrapped (identity preserved)', () => {
    const sync = (req, res, next) => next()
    const [path, handler] = capture('use', '/p', sync)

    expect(path).toBe('/p')
    expect(handler).toBe(sync) // not wrapped
  })

  test('preserves arg order and wraps only the async middleware in a chain', async () => {
    const sync = (req, res, next) => next()
    const err = new Error('async mw failed')
    const asyncMw = async () => {
      throw err
    }

    const [path, first, second] = capture('get', '/p', sync, asyncMw)

    expect(path).toBe('/p')
    expect(first).toBe(sync) // sync middleware untouched

    const next = jest.fn()
    await second({}, {}, next) // async middleware wrapped
    expect(next).toHaveBeenCalledWith(err)
  })
})
