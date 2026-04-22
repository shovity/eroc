// test/event.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('event', () => {
  it('should emit and receive events', async () => {
    const { event } = await import('../src/event.js')

    let received: unknown = null
    event.on('test', (data) => {
      received = data
    })
    event.emit('test', { foo: 'bar' })

    assert.deepStrictEqual(received, { foo: 'bar' })
  })

  it('should support multiple handlers', async () => {
    const { event } = await import('../src/event.js')

    const results: number[] = []
    event.on('multi', () => results.push(1))
    event.on('multi', () => results.push(2))
    event.emit('multi', null)

    assert.deepStrictEqual(results, [1, 2])
  })

  it('should remove handler with off()', async () => {
    const { event } = await import('../src/event.js')

    let count = 0
    const handler = () => {
      count++
    }

    event.on('removable', handler)
    event.emit('removable', null)
    assert.strictEqual(count, 1)

    event.off('removable', handler)
    event.emit('removable', null)
    assert.strictEqual(count, 1)
  })
})
