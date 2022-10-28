const http = require('http')
const Event = require('events')

const vanguard = require('./vanguard')


const genNextUrl = (data, req, res) => {

    if (!Array.isArray(data)) {
        return ''
    }

    const limit = +req.gp('limit', res.u.paging)
    const offset = +req.gp('offset', 0) + limit
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
            check(await vanguard.get(req), 'Require login')
        },
        role: async (role) => {
            const roles = role.split(' ').filter(r => r)
            const user = await vanguard.get(req)

            check(user, 'Require login')
            check(vanguard.checkRole(user, roles), { message: '403 Forbidden', require: roles })
        },
    }

    res.success = (data, option) => {
        const response = {}

        res.u.paging = req.gp('limit', null)
        
        if (!option) {
            option = {}
        }

        if (option.meta) {
            response.meta = option.meta
        }

        if (data !== undefined) {
            response.data = data
        }

        if (res.u.paging) {
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