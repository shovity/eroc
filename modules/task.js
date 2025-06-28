const { AsyncLocalStorage } = require('node:async_hooks')
const uuid = require('uuid')
const tx = require('./tx')
const kafka = require('./kafka')
const config = require('./config')
const logger = require('./logger')

const task = {
  asyncLocalStorage: new AsyncLocalStorage(),
}

task.emit = (name, data, key) => {
  const topic = `task.${name}`

  const meta = {
    sender: task.asyncLocalStorage.getStore()?.get('sender') || tx.get('txid') || uuid.v4(),
    trips: task.asyncLocalStorage.getStore()?.get('trips') || [],
  }

  kafka.pub(topic, { data, meta }, key)
}

task.on = (name, handle) => {
  check(handle.constructor.name === 'AsyncFunction', 'Param handle must be a AsyncFunction')

  const topic = `task.${name}`

  const option = {
    group: `${config.service}:${config.env}:${topic}`,
    fb: true,
    retry: 1,
  }

  /**
   * Disable comsumer group and from beginning in local
   * then it's like event
   */
  if (config.env === 'local') {
    option.fb = false
    option.group += Date.now()
  }

  const wrap = async ({ data, meta }, km) => {
    return task.asyncLocalStorage.run(new Map(), () => {
      meta.loop = 0

      for (const trip of meta.trips) {
        if (trip === name) {
          meta.loop++
        }
      }

      meta.trips.push(name)

      if (meta.trips.length > config.task_trip_max) {
        logger.error('Task break because reached maximum trip', meta)
        return
      }

      if (meta.loop > config.task_loop_max) {
        logger.error('Task break because reached maximum loop', meta)
        return
      }

      task.asyncLocalStorage.getStore().set('sender', meta.sender)
      task.asyncLocalStorage.getStore().set('trips', meta.trips.concat())

      meta.timestamp = +km.message.timestamp
      return handle(data, meta)
    })
  }

  kafka.sub(topic, option, wrap)
}

module.exports = task
