import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('tx', () => {
  it('should store and retrieve values in async context', async () => {
    const { tx } = await import('../src/tx.js')

    await tx.run(async () => {
      tx.set('key', 'value')
      assert.strictEqual(tx.get('key'), 'value')

      await new Promise((r) => setTimeout(r, 10))
      assert.strictEqual(tx.get('key'), 'value')
    })
  })

  it('should isolate contexts', async () => {
    const { tx } = await import('../src/tx.js')

    const results: (string | undefined)[] = []

    await Promise.all([
      tx.run(async () => {
        tx.set('id', 'context1')
        await new Promise((r) => setTimeout(r, 10))
        results.push(tx.get('id'))
      }),
      tx.run(async () => {
        tx.set('id', 'context2')
        await new Promise((r) => setTimeout(r, 5))
        results.push(tx.get('id'))
      }),
    ])

    assert.ok(results.includes('context1'))
    assert.ok(results.includes('context2'))
  })
})
