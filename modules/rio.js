const Event = require('events')
const util = require('./util')

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

rio.root = () => {
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

            res.u.emit('success', response)
        }

        res.error = (error, option = {}) => {
            res.status(option.code || 400)

            if (typeof error === 'string') {
                error = {
                    message: error,
                }
            }

            res.json({
                error: {
                    url: req.originalUrl,
                    method: req.method,
                    ...error,
                },
            })
        }

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

module.exports = rio
