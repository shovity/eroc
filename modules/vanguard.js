const jwt = require('./jwt')
const requester = require('./requester')
const config = require('./config')
const util = require('./util')

const vanguard = {}

/**
 * Get and verify user JWT from header or cooke
 * @param {Request} req
 * @returns {Object} Token payload
 */
vanguard.getUser = async (req) => {
    const token = req.headers.token || req.cookies.token

    if (token) {
        return await jwt.verify(token)
    }
}

/**
 * Get client from header and data from config
 * @param {Request} req
 * @returns {Object} Client plain object
 */
vanguard.getClient = async (req) => {
    const client = req.headers.client

    if (client && config.clients?.length) {
        const data = config.clients.find((c) => c.key === client)
        check(data, 'Client not found')
        return data
    }
}

/**
 * Authentication for gateway
 * @param {Object} option { week: Reject access when missing token }
 * @returns {Function} Middleware
 */
vanguard.gate = (option = {}) => {
    const rediser = require('./rediser')

    return (req, res, next) => {
        const handle = async () => {
            const token = req.headers.token || req.cookies.token

            if (!token) {
                if (option.weak) {
                    return next()
                }

                res.u.cookie('token', '')

                if (option.page) {
                    return res.redirect(`/login?next=${req.originalUrl}`)
                } else {
                    return res.error({ message: '401 Unauthorized' }, { code: 401 })
                }
            }

            req.u.user = await jwt.verify(token).catch((error) => {
                res.u.cookie('token', '')
                return next(error)
            })

            const tiat = await rediser.hget('user_tiat', req.u.user._id)

            if (tiat === null) {
                if (option.api) {
                    return res.error('user tiat not found')
                } else {
                    res.u.cookie('token', '')
                    return res.redirect(`/login?next=${req.originalUrl}`)
                }
            }

            if (req.u.user.iat < tiat) {
                const { data } = await requester.post('user/v1/users/token', { token })
                req.u.user = await jwt.verify(data.token)

                if (req.headers.token) {
                    return res.error({
                        message: 'token_expired',
                        token: data.token,
                    })
                } else {
                    res.u.cookie('token', data.token)
                    req.cookies.token = data.token
                    req.headers.cookie = req.headers.cookie.replace(`token=${token}`, `token=${data.token}`)
                }
            }

            next()
        }

        handle().catch((error) => {
            res.u.cookie('token', '')
            console.error(error)
            return next('Có lỗi trong quá trình đăng nhập, vui lòng thử lại')
        })
    }
}

/**
 * Just detect if request is authenticated
 * and build req.u.user
 * @returns Middleware
 */
vanguard.detect = () => {
    return async (req, res, next) => {
        const handle = async () => {
            if (!req.u.user) {
                const token = req.headers.token || req.cookies.token

                if (token) {
                    req.u.user = await jwt.verify(token).catch((error) => {
                        req.cookies.token && res.u.cookie('token', '')
                        return next(error)
                    })
                }
            }

            if (!req.u.client) {
                const client = req.headers.client

                if (client && config.clients?.length) {
                    req.u.client = config.clients.find((c) => c.key === client)
                }
            }

            next()
        }

        handle().catch((error) => {
            res.u.cookie('token', '')
            console.error(error)
            return next('Có lỗi trong quá trình đăng nhập, vui lòng thử lại')
        })
    }
}

vanguard.role = (role, reject) => {
    const roles = role.split(' ').filter((r) => r)

    return (req, res, next) => {
        if (!util.intersect(req.u.user?.roles, roles)) {
            if (reject) {
                reject()
            } else {
                return res.error({ message: '403 Forbidden', require: roles }, { code: 403 })
            }
        }

        return next()
    }
}

module.exports = vanguard
