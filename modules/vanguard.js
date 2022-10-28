const vanguard =  {}


/**
 * Get and verify JWT from header or cooke
 * @param {Request} req 
 * @returns {Object} Token payload
 */
vanguard.get = async (req) => {
    const token = req.headers.token || req.cookies.token

    if (token) {
        return await jwt.verify(token)
    }
}

/**
 * Authentication for gateway
 * @param {Object} option { week: Reject access when missing token }
 * @returns {Function} Middleware
 */
vanguard.gate = (option={}) => {
    const rediser = require('./rediser')

    return (req, res, next) => {

        const handle = async () => {
            const token = req.headers.token || req.cookies.token

            if (!token) {
                if (option.weak) {
                    return next()
                }

                if (option.api) {
                    res.u.cookie('token', '')
                    return res.error({ message: '401 Unauthorized' }, { code: 401 })
                } else {
                    res.u.cookie('token', '')
                    return res.redirect(`/login?next=${req.originalUrl}`)
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
                const { data } = await requester.get(`$user:v1/users/token`, { token })
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
            return next('Có lỗi trong quá trình đang nhập, vui lòng thử lại')
        })
    }
}



vanguard.detect = () => {

    return async (req, res, next) => {

        const handle = async () => {
            const token = req.headers.token || req.cookies.token

            if (token) {
                req.u.user = await jwt.verify(token).catch((error) => {
                    res.u.cookie('token', '')
                    return next(error)
                })
            }

            next()
        }

        handle().catch((error) => {
            res.u.cookie('token', '')
            console.error(error)
            return next('Có lỗi trong quá trình đang nhập, vui lòng thử lại')
        })
    }
}

vanguard.checkRole = (user, roles) => {
    if (!user || !Array.isArray(user.roles)) {
        return
    }

    return roles.find(r => user.roles.indexOf(r) !== -1)
}

vanguard.role = (role, reject) => {
    const roles = role.split(' ').filter(r => r)

    return (req, res, next) => {
        if (!vanguard.checkRole(req.u.user, roles)) {
            return res.error({ message: '403 Forbidden', require: roles }, { code: 403 })
        }

        return next()
    }
}


module.exports = vanguard