const config = require('./config')
const request = require('./request')
const jwt = require('./jwt')
const tx = require('./tx')
const Router = require('./Router')

const vanguard = {
    detector: {
        token: () => {
            return async (req) => {
                if (!req.u.user && req.headers.token) {
                    req.u.user = await jwt.verify(req.headers.token)
                }
            }
        },

        cookie: () => {
            return async (req) => {
                if (!req.u.user && req.cookies.token) {
                    req.u.user = await jwt.verify(req.cookies.token)
                }
            }
        },

        client: () => {
            check(config.redis_uri, 'Vangards detector "client" require confnig.redis_uri')
            const redis = require('./redis')

            return async (req) => {
                if (!req.u.client && req.headers.client) {
                    req.u.client = await redis.hget('user:client', req.headers.client)
                }
            }
        },
    },

    supervisor: {
        tiat: () => {
            check(config.redis_uri, 'Vangards supervisor "tiat" require confnig.redis_uri')
            const redis = require('./redis')

            return (req, res, next) => {
                const handle = async () => {
                    if (!req.u.user) {
                        return next()
                    }

                    const tiat = await redis.hget('user_tiat', req.u.user._id)

                    if (tiat === null) {
                        res.u.cookie('token', '')

                        return next({
                            message: 'User not found in vanguard code:vanguard_user_not_found',
                            logout: true,
                        })
                    }

                    if (req.u.user.iat < tiat) {
                        const token = req.headers.token || req.cookies.token
                        const { data } = await request.post('user/v1/users/token', { token })
                        req.u.user = await jwt.verify(data.token)

                        if (req.headers.token) {
                            return next({ message: 'Token expired code:token_expired', token: data.token })
                        } else {
                            res.u.cookie('token', data.token)
                            req.cookies.token = data.token
                            req.headers.cookie = req.headers.cookie.replace(`token=${token}`, `token=${data.token}`)
                        }
                    }

                    if (req.u.user.status && req.u.user.status !== 'active') {
                        return next({
                            message: 'User status not active code:user_status_not_active',
                            logout: true,
                        })
                    }

                    next()
                }

                handle().catch((error) => {
                    res.u.cookie('token', '')

                    return next({
                        message: error.message || error,
                        logout: true,
                    })
                })
            }
        },

        internal: () => {
            const router = Router()

            router.use('/:service([a-z-]+)/in/*', async (req, res, next) => {
                check(req.headers.client === config.client, 'Internal api access denied')
                next()
            })

            return router
        },

        ui: () => {
            check(config.redis_uri, 'Vangards supervisor "ui" require confnig.redis_uri')
            const redis = require('./redis')
            const router = Router()

            router.use('/:service([a-z-]+)/ui/:path(*)', async (req, res, next) => {
                const { service, path } = req.params
                const role = await redis.hget('vanguard:ui', `/${service}~${path}`)

                role && (await req.auth.or(role))
                next()
            })

            return router
        },

        login: () => {
            return async (req, res, next) => {
                if (!req.u.user && !req.u.client) {
                    if (!req.headers['content-type']) {
                        return res.redirect(`/login?next=${req.originalUrl}`)
                    }

                    return res.status(401).error('401 Unauthorized')
                }

                next()
            }
        },
    },
}

vanguard.detect = () => {
    const detectors = []

    Object.assign(vanguard.detector, config.vanguard_detector_handle)

    for (const raw of config.vanguard_detector.split(',')) {
        const name = raw.trim()

        if (!name) {
            continue
        }

        const detector = vanguard.detector[name] ? vanguard.detector[name]() : undefined
        check(detector, `vanguard: detector not found: "${name}"`)

        detectors.push(detector)
    }

    return async (req, res, next) => {
        const handle = async () => {
            for (const detector of detectors) {
                await detector(req)
            }

            if (req.u.user) {
                tx.set('uid', req.u.user._id)
            }
        }

        try {
            await handle()
            next()
        } catch (error) {
            req.cookies.token && res.u.cookie('token', '')

            return next({
                message: error.message || error,
                logout: true,
            })
        }
    }
}

vanguard.supervise = () => {
    const router = Router()

    for (const raw of config.vanguard_supervisor.split(',')) {
        const name = raw.trim()

        if (!name) {
            continue
        }

        const supervisor = vanguard.supervisor[name] ? vanguard.supervisor[name]() : undefined
        check(supervisor, `vanguard: supervisor not found: "${name}"`)

        router.use(supervisor)
    }

    return router
}

module.exports = vanguard
