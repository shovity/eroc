const crypto = require('crypto')

const rediser = require('./rediser')

const cacher = {}


cacher.middle = (option) => {

    // default option
    option = Object.assign({
        expire: 173200, // 3d
        prefix: '',
    }, option)

    if (typeof option.prefix === 'function') {
        option.prefix = option.prefix()
    }

    return async (req, res, next) => {
        const md5sum = crypto.createHash('md5')
        const [ base, param ] = req.originalUrl.split('?')
        const key = `cacher:middle:${option.prefix}:${base}:${param ? md5sum.update(param).digest('base64') : ''}`

        if (req.headers.cacher !== 'disable') {
            const data = await rediser.get(key)

            if (data) {
                res.append('cacher', 'hit')
                return res.json(data)
            }

            res.append('cacher', 'miss')
        } else {
            res.append('cacher', 'disable')
        }

        res.u.on('success', (data) => {
            rediser.set(key, data)
            rediser.expire(key, option.expire)
        })

        next()
    }
}



module.exports = cacher