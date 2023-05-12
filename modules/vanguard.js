const jwt = require('./jwt')
const request = require('./request')
const config = require('./config')
const tx = require('./tx')

const vanguard = {
    preset: config.vanguard_preset || 'token',

    detector: {
        token: () => {
            return async (req) => {
                // Detect main token
                if (!req.u.user && (req.headers.token || req.cookies.token)) {
                    req.u.user = await jwt.verify(req.headers.token || req.cookies.token)
                }
            }
        },

        cms: () => {
            return async (req) => {
                // Detect CMS token
                if (!req.headers.token && req.headers['cms-token']) {
                    const data = await jwt.verify(req.headers['cms-token'], { secret: config.cms_jwt_secret })
                    const { data: user } = await request.get(`user/in/users/${data.sub}`)

                    check(user, 'Missing cms user')
                    req.u.user = user
                    req.u.user.tiat = Infinity
                    req.headers.token = jwt.sign(req.u.user)
                }
            }
        },

        client: () => {
            const redis = require('./redis')

            return async (req) => {
                // Detect client
                if (req.headers.client) {
                    req.u.client = config.clients?.find((c) => c.key === req.headers.client)

                    if (!req.u.client) {
                        req.u.client = await redis.hget('user:client', req.headers.client)
                    }
                }
            }
        },
    },
}

/**
 * Just detect 🔍 if request is authenticated
 * and build req.u.user
 * and build req.u.client
 * @returns {Function} Middleware
 */
vanguard.detect = () => {
    const detectors = []

    for (const preset of vanguard.preset.split(',')) {
        const detector = vanguard.detector[preset] ? vanguard.detector[preset]() : undefined
        check(detector, `vanguard: detector preset not found: "${preset}"`)

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

            next()
        }

        handle().catch((error) => {
            req.cookies.token && res.u.cookie('token', '')
            return next(error)
        })
    }
}

/**
 * Authentication for gateway 🧱
 * vanguard.gate() must use after vanguard.detect()
 * @param {Object} option { week: Reject access when missing token }
 * @param {Object} option { page: Response human-readable }
 * @returns {Function} Middleware
 */
vanguard.gate = (option = {}) => {
    const redis = require('./redis')

    return (req, res, next) => {
        const handle = async () => {
            if (!req.u.user && !req.u.client) {
                // Missing authentication by vanguard.detect

                if (option.weak) {
                    return next()
                }

                if (option.page) {
                    return res.redirect(`/login?next=${req.originalUrl}`)
                } else {
                    return res.status(401).error('401 Unauthorized')
                }
            }

            if (req.u.user) {
                const tiat = await redis.hget('user_tiat', req.u.user._id)

                if (tiat === null) {
                    res.u.cookie('token', '')

                    if (option.page) {
                        return res.redirect(`/login?next=${req.originalUrl}`)
                    } else {
                        return res.status(401).error('User tiat not found')
                    }
                }

                if (req.u.user.iat < tiat) {
                    // Ensure token refresh

                    const token = req.headers.token || req.cookies.token
                    const { data } = await request.post('user/v1/users/token', { token })
                    req.u.user = await jwt.verify(data.token)

                    if (req.headers.token) {
                        return res.error({ message: 'token_expired', token: data.token })
                    } else {
                        res.u.cookie('token', data.token)
                        req.cookies.token = data.token
                        req.headers.cookie = req.headers.cookie.replace(`token=${token}`, `token=${data.token}`)
                    }
                }
            }

            next()
        }

        handle().catch((error) => {
            res.u.cookie('token', '')
            return next(error)
        })
    }
}

module.exports = vanguard
