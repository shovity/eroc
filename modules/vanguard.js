const jwt = require('./jwt')
const request = require('./request')
const config = require('./config')

const vanguard = {}

/**
 * Just detect 🔍 if request is authenticated
 * and build req.u.user
 * and build req.u.client
 * @returns {Function} Middleware
 */
vanguard.detect = () => {
    return async (req, res, next) => {
        const handle = async () => {
            //* Main header > CMS header > Main cookie

            // Detect CMS token
            if (!req.headers.token && req.headers['cms-token']) {
                const data = await jwt.verify(req.headers['cms-token'], { secret: config.cms_jwt_secret })
                const { data: user } = await request.get(`user/in/users/${data.sub}`)

                check(user, 'Missing cms user')
                req.u.user = user
                req.u.user.tiat = Infinity
                req.headers.token = jwt.sign(req.u.user)
            }

            // Detect main token
            if (!req.u.user && (req.headers.token || req.cookies.token)) {
                req.u.user = await jwt.verify(req.headers.token || req.cookies.token)
            }

            // Detect client
            if (req.headers.client && config.clients?.length) {
                req.u.client = config.clients.find((c) => c.key === req.headers.client)
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
