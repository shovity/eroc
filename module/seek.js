const fs = require('fs').promises
const path = require('path')

const config = require('./config')
const scan = require('./scan')


const readable = async (dir) => {
    if (!dir) {
        return false
    }

    try {
        await fs.access(dir)
        return true
    } catch (error) {
        return false
    }
}

const seek = async (app) => {
    
    if (await readable(config.scan_router)) {
        const router = await scan('router', config.scan_router)
        app.use(path.join('/', config.service), router)
    }

    if (await readable(config.scan_public)) {
        app.use(express.static(path.join(config.app_dir, config.scan_public)))
    }

    if (await readable(config.scan_static)) {
        const match = path.join('/', config.service, 'static')

        app.use(match, express.static(path.join(config.app_dir, config.scan_static)))

        app.use(match, async (req, res, next) => {
            res.status(404)
            return res.end('Static not found')
        })
    }
}


module.exports = seek