const requester = require('./requester')
const jwt = require('./jwt')
const config = require('./config')


const ruler = {}

ruler.get = async (req) => {
    const token = req.headers.token || req.cookies.token

    if (token) {
        return await jwt.verify(token)
    }
}

ruler.buidPermisisons = (user) => {
    if (!user?.permission || user.permissions) {
        return
    }

    user.permissions = user.permission.split(';').map((p) => {
        const [ role, scope, permission ] = p.split(':')

        return {
            role,
            scope,
            permissions: permission.split(',')
        }
    })
}

ruler.gate = (option={}) => {
    const rediser = require('./rediser')

    return (req, res, next) => {

        const handle = async () => {
            const token = req.headers.token || req.cookies.token

            if (!token) {
                if (option.weak) {
                    return next()
                }

                if (option.api) {
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

ruler.detect = () => {
    return async (req, res, next) => {

        const handle = async () => {
            const token = req.headers.token || req.cookies.token

            if (token) {
                req.u.user = await jwt.verify(token).catch((error) => {
                    res.u.cookie('token', '')
                    return next(error)
                })
            }
    
            if (!config.rulerDisableDetectClient && req.headers.client) {
                let user = {}

                if (config.clients) {
                    user = {
                        client: config.clients.find(c => c.key === req.headers.client)
                    }
                }

                if (!user?.client) {
                    const response = await requester.post('$user:in/query/User', {
                        findOne: {
                            'client.key': req.headers.client,
                            status: 'active',
                        },
                        select: {
                            client: 1,
                        }
                    })

                    user = response.data
                }

                if (!user?.client) {
                    throw 'client key not found'
                }

                req.u.client = user.client
                req.u.client.uid = user._id
            }

            if (!config.rulerDisableDetectPartner && req.headers.partner) {
                let user = {}

                if (config.clients) {
                    user = {
                        client: config.clients.find(c => c.name === req.headers.name)
                    }
                }

                if (!user?.client) {
                    const response = await requester.post('$user:in/query/User', {
                        findOne: {
                            'client.name': req.headers.partner,
                            status: 'active',
                        },
                        select: {
                            client: 1,
                        }
                    })

                    user = response.data
                }

                if (!user?.client) {
                    throw 'partner name not found'
                }

                req.u.client = user.client
                req.u.client.uid = user._id
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

ruler.checkRole = (user, roles) => {
    if (!user || !Array.isArray(user.roles)) {
        return
    }

    return roles.find(r => user.roles.indexOf(r) !== -1)
}

ruler.checkPermission = (user, role, scope, permissions) => {
    if (!user) {
        return
    }

    ruler.buidPermisisons(user)

    permissions = permissions.filter(p => p)

    return user.permissions.find((p) => {
        if (p.role !== role) {
            return
        }

        if (p.scope !== scope) {
            return
        }

        if (permissions.length) {

            for (const per of permissions) {
                if (p.permissions.includes(per)) {
                    return true
                }
            }

            return
        }

        return true
    })
}

ruler.role = (role, reject) => {
    const roles = role.split(' ').filter(r => r)

    return (req, res, next) => {
        if (!ruler.checkRole(req.u.user, roles)) {
            return res.error({ message: '403 Forbidden', require: roles }, { code: 403 })
        }

        return next()
    }
}

ruler.permission = (role, scope, permissions, reject) => {

    return (req, res, next) => {
        if (!ruler.checkPermission(req.u.user, role, scope, permissions)) {
            return res.error({ message: '403 Forbidden', require: [role, scope, permissions] }, { code: 403 })
        }

        return next()
    }
}


module.exports = ruler
