const Event = require('events')
const util = require('./util')
const Router = require('./Router')
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

rio.base = () => {
    return (req, res, next) => {
        req.gp = (key, defaultValue, validate) => {
            let value = [req.body[key], req.query[key], req.params[key], defaultValue].find((v) => v !== undefined)
            check(value !== undefined, `Missing param ${key}`)

            if (typeof validate === 'function') {
                const converted = validate(value)

                if (converted !== undefined) {
                    value = converted
                }
            } else if (Array.isArray(validate)) {
                check(validate.includes(value), `Invalid param ${key}, accept: ${validate.join(', ')}`)
            } else if (validate instanceof RegExp) {
                check(validate.test(value), `Invalid param ${key}, accept: ${validate.toString()}`)
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

            res.status(option.code || 200)
            res.json(response)

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
                check(req.u.user, 'Require login')
            },
            role: async (role, interrupt = true) => {
                const roles = role.split(' ').filter((r) => r)
                const user = req.u.user

                if (interrupt) {
                    check(user, 'Require login')
                    check(util.intersect(user.roles, roles), { message: '403 Forbidden', require: roles })
                } else {
                    return user && util.intersect(user.roles, roles)
                }
            },
            client: async (permission, interrupt = true) => {
                const permissions = permission.split(' ').filter((p) => p)
                const client = req.u.client

                if (interrupt) {
                    check(client, 'Require client key')
                    check(util.intersect(client.permissions, permissions), {
                        message: 'Insufficient permission',
                        require: permissions,
                    })
                } else {
                    return client && util.intersect(client.permissions, permissions)
                }
            },
            or: async (permission, interrupt = true) => {
                const permissions = permission.split(' ').filter((p) => p)
                const user = req.u.user
                const client = req.u.client

                const has = []

                if (user) {
                    has.push(...user.roles)
                }

                if (client) {
                    has.push(...client.permissions)
                }

                if (interrupt) {
                    check(util.intersect(has, permissions), {
                        message: 'Insufficient permission',
                        require: permissions,
                    })
                } else {
                    return util.intersect(has, permissions)
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
            socket.emit('common:core:rio:monitor', valve.pools, { room: 'common:core:rio' })
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

rio.default = () => {
    const router = Router()

    router.get('/_status', async (req, res, next) => {
        const data = {
            service: config.service,
            env: config.env,
        }

        if (await req.auth.or('ruler monitoring', false)) {
            data.config = config
        }

        return res.success(data)
    })

    return router
}

rio.cors = () => {
    return (req, res, next) => {
        const origins = config.cors_origin.split(',')

        if (origins.includes(req.headers.origin)) {
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
            res.header('Access-Control-Allow-Credentials', true)
        }

        return next()
    }
}

module.exports = rio
