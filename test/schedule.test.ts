import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('schedule', () => {
  it('should create a cron job', async () => {
    const { schedule } = await import('../src/schedule.js')

    let called = false
    const job = schedule.add('* * * * * *', () => {
      called = true
    })

    assert.ok(job)
    assert.ok(typeof job.stop === 'function')

    // Wait for potential execution
    await new Promise((r) => setTimeout(r, 1100))

    job.stop()
    assert.ok(called)
  })

  it('should remove a job', async () => {
    const { schedule } = await import('../src/schedule.js')

    let count = 0
    const job = schedule.add('* * * * * *', () => {
      count++
    })

    await new Promise((r) => setTimeout(r, 1100))
    schedule.remove(job)

    const countAfterStop = count
    await new Promise((r) => setTimeout(r, 1100))

    assert.strictEqual(count, countAfterStop)
  })
})
