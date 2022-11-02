const http = require('http')
const Event = require('events')

const vanguard = require('./vanguard')
const util = require('./util')


const genNextUrl = (data, req, res) => {

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

    return `${req.originalUrl.split('?')[0]}?${Object.keys(query).map(k => `${k}=${query[k]}`).join('&')}`
}

const rio = (req, res, next) => {

    req.u = res.u = new Event()

    req.u.cookie = (key, value, option={}) => {

        option = {
            maxAge: 31104000000,
            ...option
        }

        res.cookie(key, value, option)
    }

    req.gp = (key, defaultValue, convert) => {
        const value = [req.body[key], req.query[key], req.params[key], defaultValue].find(v => v !== undefined)

        if (value === undefined) {
            // need throw exception to break api handle
            // express error will catch it
            throw `missing param ${key}`
        }

        return convert ? convert(value) : value
    }

    req.auth = {
        login: async () => {
            check(await vanguard.getUser(req), 'Require login')
        },
        role: async (role) => {
            const roles = role.split(' ').filter(r => r)
            const user = await vanguard.getUser(req)

            check(user, 'Require login')
            check(util.intersect(user.roles, roles), { message: '403 Forbidden', require: roles })
        },
        client: async (permission) => {
            const permissions = permission.split(' ').filter(p => p)
            const client = await vanguard.getClient(req)
            
            check(client, 'Require client key')
            check(util.intersect(client.permissions, permissions), { message: 'Insufficient permission', require: permissions })
        }
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
            response.meta.next = genNextUrl(data, req, res)
        }

        res.status(option.code || 200)
        res.json(response)

        res.u.emit('success', response)
    }

    res.error = (error, option={}) => {
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
            }
        })
    }

    next()
}


module.exports = rio