const path = require('node:path')

global.check = (condition, message) => {
  if (!condition) {
    const error = new Error()

    if (typeof message === 'string') {
      error.message = message
    } else {
      Object.assign(error, message)
    }

    throw error
  }
}

const eroc = {}

const proxy = new Proxy(eroc, {
  get(target, prop) {
    // Load non-existent module to 'eroc'
    if (target[prop] === undefined) {
      target[prop] = require(path.join(__dirname, `modules/${prop}`))
    }

    return target[prop]
  },
})

module.exports = proxy
