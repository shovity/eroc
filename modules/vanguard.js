const jwt = require('./jwt')
const requester = require('./requester')
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
            // Detect CMS token
            if (!req.u.user) {
                const token = req.headers['cms-token']

                if (token) {
                    const data = await jwt.verify(token, { secret: config.cms_jwt_secret })
                    const { data: user } = await requester.get(`user/in/users/${data.sub}`)

                    check(user, 'Missing cms user')
                    req.u.user = user
                    req.u.user.tiat = Infinity
                }
            }

            // Detect main token
            if (!req.u.user) {
                const token = req.headers.token || req.cookies.token

                if (token) {
                    req.u.user = await jwt.verify(token).catch((error) => {
                        req.cookies.token && res.u.cookie('token', '')
                        return next(error)
                    })
                }
            }

            // Detect client
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

/**
 * Authentication for gateway 🧱
 * vanguard.gate() must use after vanguard.detect()
 * @param {Object} option { week: Reject access when missing token }
 * @param {Object} option { page: Response human-readable }
 * @returns {Function} Middleware
 */
vanguard.gate = (option = {}) => {
    const rediser = require('./rediser')

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
                    return res.error({ message: '401 Unauthorized' }, { code: 401 })
                }
            }

            const tiat = await rediser.hget('user_tiat', req.u.user._id)

            if (tiat === null) {
                res.u.cookie('token', '')

                if (option.page) {
                    return res.redirect(`/login?next=${req.originalUrl}`)
                } else {
                    return res.error({ message: 'User tiat not found' }, { code: 401 })
                }
            }

            if (req.u.user.iat < tiat) {
                // Ensure token refresh

                const token = req.headers.token || req.cookies.token
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

module.exports = vanguard
