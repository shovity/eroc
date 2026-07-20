// Unit test for the task module — HMAC-SHA256 sign/verify against Kafka message spoofing.
// Run: pnpm run test core/modules/task.spec.js

global.check = (condition, message) => {
  if (!condition) {
    const error = new Error()
    typeof message === 'string' ? (error.message = message) : Object.assign(error, message)
    throw error
  }
}

const mockConfig = {
  kafka_hmac_secret: 'test-secret-please-change',
  service: 'test',
  env: 'test',
  task_trip_max: 20,
  task_loop_max: 5,
}
const mockKafka = { pub: jest.fn(), sub: jest.fn() }
const mockLogger = { error: jest.fn(), info: jest.fn() }

jest.mock('./config', () => mockConfig)
jest.mock('./kafka', () => mockKafka)
jest.mock('./logger', () => mockLogger)
jest.mock('./tx', () => ({ get: () => 'txid-1' }))

const task = require('./task')

// Grab the wrap function that task.on registers with kafka.sub
const getWrap = async (name, handle) => {
  mockKafka.sub.mockClear()
  await task.on(name, handle)
  return mockKafka.sub.mock.calls[0][1]
}

const fakeKm = { message: { timestamp: '1700000000000' } }

beforeEach(() => {
  mockConfig.kafka_hmac_secret = 'test-secret-please-change'
  mockKafka.pub.mockClear()
  mockLogger.error.mockClear()
})

describe('task._sign / task._verify', () => {
  test('round-trip: sign then verify matches', () => {
    const payload = { data: { x: 1 }, meta: { sender: 's', trips: [], timestamp: 1 } }
    const sig = task._sign(payload)

    expect(typeof sig).toBe('string')
    expect(task._verify(payload, sig)).toBe(true)
  })

  test('rejects a tampered meta.sender', () => {
    const payload = { data: { x: 1 }, meta: { sender: 'svc-a', trips: [], timestamp: 1 } }
    const sig = task._sign(payload)

    const forged = { data: { x: 1 }, meta: { sender: 'admin-service', trips: [], timestamp: 1 } }
    expect(task._verify(forged, sig)).toBe(false)
  })

  test('rejects a tampered meta.trips (loop/trip bypass)', () => {
    const payload = { data: {}, meta: { sender: 's', trips: ['a'], timestamp: 1 } }
    const sig = task._sign(payload)

    const forged = { data: {}, meta: { sender: 's', trips: ['a', 'a', 'a'], timestamp: 1 } }
    expect(task._verify(forged, sig)).toBe(false)
  })

  test('returns false on missing or wrong-length signature (no throw)', () => {
    const payload = { data: {}, meta: {} }
    expect(task._verify(payload, undefined)).toBe(false)
    expect(task._verify(payload, '')).toBe(false)
    expect(task._verify(payload, 'abcd')).toBe(false)
  })
})

describe('task.emit', () => {
  test('with secret: publishes with a valid signature', async () => {
    await task.emit('notification.send', { to: 'u1' })

    expect(mockKafka.pub).toHaveBeenCalledTimes(1)
    const [topic, payload] = mockKafka.pub.mock.calls[0]

    expect(topic).toBe('task.notification.send')
    expect(payload.signature).toBeDefined()
    expect(task._verify({ data: payload.data, meta: payload.meta }, payload.signature)).toBe(true)
  })

  test('without secret: publishes without a signature', async () => {
    mockConfig.kafka_hmac_secret = ''
    await task.emit('notification.send', { to: 'u1' })

    const [, payload] = mockKafka.pub.mock.calls[0]
    expect(payload.signature).toBeUndefined()
    expect(payload.data).toEqual({ to: 'u1' })
  })
})

describe('task.on -> wrap (verify before processing)', () => {
  // task.on requires a real AsyncFunction handle; wrap a spy in an async fn
  const makeHandle = () => {
    const spy = jest.fn()
    const handle = async (...args) => spy(...args)
    return { spy, handle }
  }

  test('valid signature: handle is called', async () => {
    const { spy, handle } = makeHandle()
    const wrap = await getWrap('flow.a', handle)

    const data = { x: 1 }
    const meta = { sender: 's', trips: [], timestamp: 1 }
    const signature = task._sign({ data, meta })

    await wrap({ data, meta, signature }, fakeKm)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(data, expect.objectContaining({ sender: 's' }))
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('invalid signature: message dropped, handle NOT called + error logged', async () => {
    const { spy, handle } = makeHandle()
    const wrap = await getWrap('flow.b', handle)

    const data = { x: 1 }
    const meta = { sender: 'admin-service', trips: ['forged'], timestamp: 1 }

    await wrap({ data, meta, signature: 'deadbeef' }, fakeKm)

    expect(spy).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalledWith('Task rejected: invalid signature', expect.any(Object))
  })

  test('missing signature with secret set: message dropped', async () => {
    const { spy, handle } = makeHandle()
    const wrap = await getWrap('flow.c', handle)

    await wrap({ data: {}, meta: { sender: 's', trips: [], timestamp: 1 } }, fakeKm)

    expect(spy).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('without secret: handle is called regardless of signature', async () => {
    mockConfig.kafka_hmac_secret = ''
    const { spy, handle } = makeHandle()
    const wrap = await getWrap('flow.d', handle)

    await wrap({ data: { x: 1 }, meta: { sender: 's', trips: [], timestamp: 1 } }, fakeKm)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).not.toHaveBeenCalled()
  })
})
