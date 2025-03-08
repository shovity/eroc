const redis = require('./redis')

const event = {}

event.emit = (name, data) => {
  const channel = `event.${name}`
  redis.pub(channel, data)
}

event.on = (name, handle) => {
  check(handle.constructor.name === 'AsyncFunction', 'Param handle must be a AsyncFunction')

  const channel = `event.${name}`

  const wrap = (data) => {
    handle(data)
      .then(() => {
        //
      })
      .catch((error) => {
        console.error('Handle event failed', error)
      })
  }

  redis.sub(channel, wrap)
}

module.exports = event
