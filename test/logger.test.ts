import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('logger', () => {
  it('should have all log levels', async () => {
    const { logger } = await import('../src/logger.js')

    assert.ok(typeof logger.emerg === 'function')
    assert.ok(typeof logger.alert === 'function')
    assert.ok(typeof logger.crit === 'function')
    assert.ok(typeof logger.error === 'function')
    assert.ok(typeof logger.warn === 'function')
    assert.ok(typeof logger.notice === 'function')
    assert.ok(typeof logger.info === 'function')
    assert.ok(typeof logger.debug === 'function')
  })

  it('should output JSON format', async () => {
    const { createLogger } = await import('../src/logger.js')

    let output = ''
    const logger = createLogger({
      service: 'test-service',
      transporter: 'console:debug',
      output: (str: string) => {
        output = str
      },
    })

    logger.info('test message', { extra: 'data' })

    const parsed = JSON.parse(output)
    assert.strictEqual(parsed.level, 'info')
    assert.strictEqual(parsed.message, 'test message')
    assert.strictEqual(parsed.service, 'test-service')
    assert.deepStrictEqual(parsed.payload, { extra: 'data' })
    assert.ok(parsed.timestamp)
  })

  it('should respect log level filtering', async () => {
    const { createLogger } = await import('../src/logger.js')

    let callCount = 0
    const logger = createLogger({
      transporter: 'console:warn',
      output: () => {
        callCount++
      },
    })

    logger.debug('should not log')
    logger.info('should not log')
    logger.warn('should log')
    logger.error('should log')

    assert.strictEqual(callCount, 2)
  })
})
