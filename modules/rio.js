const Event = require('node:events')
const util = require('./util')
const config = require('./config')

const rio = {}

const genNextUrl = (data, req) => {
  if (!Array.isArray(data)) {
    return ''
  }

  const limit = req.gp('limit', 12, Number)
  const offset = req.gp('offset', 0, Number) + limit
  const query = { ...req.query }

  if (data.length < limit) {
    return ''
  }

  query.offset = offset

  return `${req.originalUrl.split('?')[0]}?${Object.keys(query)
    .map((k) => `${k}=${query[k]}`)
    .join('&')}`
}

const validator = {
  string: (value) => {
    return String(value)
  },

  number: (value, key) => {
    value = Number(value)
    check(!isNaN(value), `Invalid number: ${key}`)
    return value
  },

  date: (value, key) => {
    value = new Date(+value || value)
    check(!isNaN(value.getTime()), `Invalid date: ${key}`)
    return value
  },

  comma: (value) => {
    return value
      .toString()
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  },
}

rio.base = () => {
  Object.assign(validator, config.rio_validator)

  return (req, res, next) => {
    req.gp = (key, defaultValue, validate) => {
      let value = [req.body[key], req.query[key], req.params[key], defaultValue].find((v) => v !== undefined)
      check(value !== undefined, `Missing param: ${key} code:missing_param`)

      if (value === defaultValue) {
        return value
      }

      if (validate instanceof RegExp) {
        check(validate.test(value), `Invalid param ${key}, accept: ${validate.toString()}`)
        return value
      }

      if (Array.isArray(validate)) {
        check(validate.includes(value), `Invalid param ${key}, accept: ${validate.join(', ')}`)
        return value
      }

      if (typeof validate === 'function') {
        const converted = validate(value, key)

        if (converted !== undefined) {
          return converted
        }
      }

      if (typeof validate === 'object') {
        const options = Object.values(validate)

        if (options.length) {
          check(options.includes(value), `Invalid param ${key}, accept: ${options.join(', ')}`)
          return value
        }
      }

      if (typeof validate === 'string') {
        const handle = validator[validate]
        check(handle, `Rio validator not found: ${validate}`)

        return handle(value, key)
      }

      return value
    }

    res.success = (data, option) => {
      const response = {}

      if (!option) {
        option = {}
      }

      if (option.meta) {
        response.meta = option.meta
      }

      if (data !== undefined) {
        response.data = data
      }

      if (req.gp('limit', null)) {
        response.meta = response.meta || {}
        response.meta.next = genNextUrl(data, req)
      }

      res.status(option.code || 200).json(response)
      res.u.emit('response_success', response)
    }

    res.error = (error) => {
      check(false, error)
    }

    next()
  }
}

rio.util = () => {
  return (req, res, next) => {
    req.u = new Event()
    res.u = req.u

    req.u.cookie = (key, value, option = {}) => {
      option = {
        maxAge: 31104000000,
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        ...option,
      }

      res.cookie(key, value, option)
    }

    next()
  }
}

rio.auth = () => {
  return (req, res, next) => {
    req.auth = {
      login: async () => {
        check(req.u.user, 'Require login code:requrie_login')
      },
      // Authorization check against the authenticated user's roles.
      role: async (role, interrupt = true) => {
        const roles = role.split(' ').filter((r) => r)
        const has = req.u.user ? req.u.user.roles : []

        if (interrupt) {
          const accept = roles.join(', ')

          check(util.intersect(has, roles), {
            message: `Insufficient permission. Accept: ${accept} code:insufficient_permission`,
            accepts: roles,
          })
        } else {
          return util.intersect(has, roles)
        }
      },
    }

    next()
  }
}

rio.monitor = () => {
  const socket = require('./socket')

  const valve = {
    caller: util.throttle(),
    pools: [],
  }

  valve.push = (req, response) => {
    valve.pools.push({
      path: req.originalUrl.split('?')[0],
      method: req.method,
      query: req.query,
      header: req.headers,
      body: req.body,
      duration: Date.now() - req.u.receive,
      created: Date.now(),
      response,
    })

    valve.caller.execute(() => {
      socket.emit('common:core:rio:monitor', valve.pools, {
        room: 'common:core:rio',
      })
      valve.pools = []
    })
  }

  return (req, res, next) => {
    req.u.receive = Date.now()

    res.u.on('response_success', (response) => valve.push(req, response))
    res.u.on('response_error', (response) => valve.push(req, response))

    next()
  }
}

rio.cors = () => {
  return (req, res, next) => {
    if (!config.cors_origin) {
      return next()
    }

    const origins = config.cors_origin.split(',')

    if (config.cors_origin === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*')
    } else if (origins.includes(req.headers.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    }

    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Headers', '*')
    res.header('Access-Control-Allow-Methods', '*')

    return next()
  }
}

module.exports = rio
