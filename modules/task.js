const crypto = require('node:crypto')
const { AsyncLocalStorage } = require('node:async_hooks')
const uuid = require('uuid')
const tx = require('./tx')
const kafka = require('./kafka')
const config = require('./config')
const logger = require('./logger')

const task = {
  asyncLocalStorage: new AsyncLocalStorage(),
}

/**
 * Sign payload {data, meta} with HMAC-SHA256 using config.kafka_hmac_secret.
 * @returns {string} hex signature
 */
task._sign = (payload) => {
  return crypto.createHmac('sha256', config.kafka_hmac_secret).update(JSON.stringify(payload)).digest('hex')
}

/**
 * Verify the signature in constant time. Returns false when missing or invalid.
 */
task._verify = (payload, signature) => {
  if (typeof signature !== 'string' || !signature) {
    return false
  }

  const expected = task._sign(payload)
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(signature, 'hex')

  // timingSafeEqual throws on length mismatch -> check first to avoid leaking via exception
  if (a.length !== b.length) {
    return false
  }

  return crypto.timingSafeEqual(a, b)
}

task.emit = async (name, data, key) => {
  const topic = `task.${name}`

  const meta = {
    sender: task.asyncLocalStorage.getStore()?.get('sender') || tx.get('txid') || uuid.v4(),
    trips: task.asyncLocalStorage.getStore()?.get('trips') || [],
    timestamp: Date.now(),
  }

  // Sign the message when a secret is configured; otherwise publish as before
  if (config.kafka_hmac_secret) {
    const signature = task._sign({ data, meta })
    return await kafka.pub(topic, { data, meta, signature }, key)
  }

  return await kafka.pub(topic, { data, meta }, key)
}

task.on = async (name, handle) => {
  check(handle.constructor.name === 'AsyncFunction', 'Param handle must be a AsyncFunction')

  const topic = `task.${name}`

  const option = {
    group: `${config.service}:${config.env}:${topic}`,
    fb: true,
    retry: 12,
  }

  /**
   * Disable comsumer group and from beginning in local
   * then it's like event
   */
  if (config.env === 'local') {
    option.fb = false
    option.group += Date.now()
  }

  const wrap = async ({ data, meta, signature }, km) => {
    // Verify the signature BEFORE any meta mutation; forged messages are dropped
    if (config.kafka_hmac_secret && !task._verify({ data, meta }, signature)) {
      logger.error('Task rejected: invalid signature', { topic: name, meta })
      return
    }

    return task.asyncLocalStorage.run(new Map(), () => {
      meta.loop = 0

      for (const trip of meta.trips) {
        if (trip === name) {
          meta.loop++
        }
      }

      meta.trips.push(name)

      const maxTrip = config.task_trip_max ?? 10
      const maxLoop = config.task_loop_max ?? 3

      if (meta.trips.length > maxTrip) {
        logger.error('Task break because reached maximum trip', meta)
        return
      }

      if (meta.loop > maxLoop) {
        logger.error('Task break because reached maximum loop', meta)
        return
      }

      task.asyncLocalStorage.getStore().set('sender', meta.sender)
      task.asyncLocalStorage.getStore().set('trips', meta.trips.concat())

      meta.timestamp = +km.message.timestamp
      return handle(data, meta)
    })
  }

  return await kafka.sub(topic, wrap, option)
}

module.exports = task
