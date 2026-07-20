import { describe, it } from 'node:test'
import assert from 'node:assert'

// event is distributed via Redis pub/sub — full behavior needs a Redis server,
// here we only verify the API surface and that failures are contained
describe('event', () => {
  it('should expose emit and on', async () => {
    const { event } = await import('../src/event.js')

    assert.ok(typeof event.emit === 'function')
    assert.ok(typeof event.on === 'function')
  })

  it('emit without redis should not throw synchronously', async () => {
    const { event } = await import('../src/event.js')

    assert.doesNotThrow(() => event.emit('test.event', { a: 1 }))
    // Let the background failure settle so it doesn't leak into other tests
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
})
