const path = require('path')
const fs = require('fs').promises

const config = require('./config')
const rediser = require('./rediser')
const scanner = require('./scanner')


const cardinal = {}

cardinal.boot = async (app) => {

    // Load remote config from redis
    if (config.redis_uri) {
        check(config.service, 'Missing config.service')
        const remoteConfig = await rediser.hget('eroc_config', config.service)
        Object.assign(config, remoteConfig)
    }

    console.log(`eroc: 🍒 Load config done - service=${config.service}, env=${config.env}`)

    if (config.mongo_uri) {
        const mongoose = require('mongoose')
    
        const connect = () => {
            mongoose.connect(config.mongo_uri, {
                useUnifiedTopology: true,
                useNewUrlParser: true,
                useCreateIndex: true,
            
                auth: {
                    authSource: 'admin',
                },
            }).then(() => {
                console.log(`mongo: 🍱 Connected - ${config.mongo_uri}`)
            }).catch((error) => {
                console.error(error)
                console.error('mongo: connect to mongod error, reconnecting...')
                setTimeout(connect, 3000)
            })
        }
    
        mongoose.set('useFindAndModify', false)
        connect()
    }
}

cardinal.seek = async (app) => {

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
    
    if (await readable(config.scan_router)) {
        const router = await scanner.router(config.scan_router)
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

cardinal.monitoring = async (app) => {

    rediser.sub(`service:${config.service}`, (message) => {
        if (message.action === 'reboot') {
            cardinal.boot(app).then(() => {
                console.log('eroc: Reboot done!')
            }).catch((error) => {
                console.log('ERROR - eroc: Reboot failed:', error)
            })
        }
    })
}


module.exports = cardinal