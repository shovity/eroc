const http = require('http')
const path = require('path')
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const exphbs = require('express-handlebars')
const config = require('./config')
const scanner = require('./scanner')
const util = require('./util')
const logger = require('./logger')

const cardinal = {
    app: null,
    server: null,
}

cardinal.create = (middle) => {
    const app = express()
    const server = http.createServer(app)

    cardinal.app = app
    cardinal.server = server

    cardinal.setup(middle).catch((error) => {
        console.log('cardinal: ERROR - Setup application failed:', error)
    })

    return { app, server }
}

cardinal.setup = async (middle) => {
    const vanguard = require('./vanguard')
    const rio = require('./rio')
    const tx = require('./tx')
    const app = cardinal.app
    const hbs = exphbs.create({ extname: 'html' })

    app.engine('html', hbs.engine)
    app.set('views', path.resolve(config.app_dir, config.seek_views))
    app.set('view engine', 'html')

    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.use(cors())

    app.use(tx.init())

    // gp success error
    app.use(rio.base())
    // u
    app.use(rio.util())
    // auth
    app.use(rio.auth())

    await cardinal.boot()

    // monitor
    config.rio_monitor && app.use(rio.monitor())

    app.use(path.join('/', config.router_prefix || config.service), rio.default())
    app.use(vanguard.detect())
    app.use(vanguard.supervise())

    middle && middle(app)?.catch(console.error)

    await cardinal.seek()
    await cardinal.monitoring()

    // Catch 404 route
    app.use((req, res, next) => {
        return res.status(404).error('404 Not found')
    })

    // Top-level and centrally exceptions
    const onError = (error, req, res, next) => {
        // Handle express error
        // error throw from sync handle and next(err)

        const response = {
            message: 'Unknow error',
            service: config.service,
            env: config.env,
            txid: tx.get('txid'),
        }

        if (req) {
            response.url = req.originalUrl
            response.method = req.method
        }

        if (typeof error === 'object') {
            Object.assign(response, error)
            response.message = error.message || error._message || 'Unknow error'
        } else if (typeof error === 'string') {
            response.message = error
        }

        if (response.message.includes('code:')) {
            const [message, code] = response.message.split('code:')
            response.message = message.trim()
            response.code = `${config.service}.${code}`.trim()
        }

        if (cardinal.breaker(response)) {
            return
        }

        const payload = typeof error === 'object' ? Object.assign({}, error) : {}

        logger.debug(response.message, payload, {
            stack: error.stack,
        })

        if (res) {
            res.status(res.statusCode === 200 ? 400 : res.statusCode).json({ error: response })
            res.u.emit('response_error', { error: response })
        }
    }

    // Express exception
    app.use(onError)

    // Unhandled Rejection
    process.on('unhandledRejection', (error) => {
        onError(error)
    })

    if (config.api_monitor) {
        const ele = require('express-list-endpoints')

        console.log('cardinal: 🧬 list apis')
        ele(app).forEach((api) => {
            api.methods.forEach((m) => console.log(`    ${m.padEnd(6)}${api.path}`))
        })
    }

    if (config.port) {
        cardinal.server.listen(config.port, () => {
            console.log(`cardinal: 🍔 HTTP server ready! - port=${config.port}`)
        })
    }

    config.deferred.setup.resolve()
}

cardinal.breaker = (response) => {
    if (response.url === '/socket/in/emitter') {
        return
    }
}

cardinal.boot = async () => {
    await config.deferred.config

    if (config.mongo_uri) {
        const mongoose = require('mongoose')

        const connect = () => {
            mongoose
                .connect(config.mongo_uri, {
                    authSource: 'admin',
                })
                .then(() => {
                    console.log(`mongo: 🍱 Connected - ${config.mongo_uri}`)
                })
                .catch((error) => {
                    console.error(error)
                    console.error('mongo: connect to mongod error, reconnecting...')
                    setTimeout(connect, 3000)
                })
        }

        mongoose.set('strictQuery', false)
        connect()
    }
}

cardinal.shutdown = async () => {
    const mongoose = require('mongoose')
    await mongoose.disconnect()
}

cardinal.seek = async () => {
    if (await util.readble(config.seek_routers)) {
        try {
            const { router, paths } = await scanner.router(config.seek_routers)
            const prefix = config.router_prefix || config.service

            cardinal.app.use(path.join('/', prefix), router)
            console.info(`cardinal: Load ${paths.length} routers done - router_prefix=${prefix}`)
        } catch (error) {
            console.error('cardinal: ERROR - seek router false', error)
        }
    }

    if (await util.readble(config.seek_public)) {
        cardinal.app.use(express.static(path.join(config.app_dir, config.seek_public)))
    }

    if (await util.readble(config.seek_static)) {
        const prefix = config.router_prefix || config.service
        const match = path.join('/', prefix, 'static')

        cardinal.app.use(
            match,
            express.static(path.join(config.app_dir, config.seek_static), {
                maxAge: config.env === 'prod' ? '1y' : 0,
            }),
        )

        cardinal.app.use(match, async (req, res, next) => {
            res.status(404)
            return res.end('Static not found')
        })
    }

    if (await util.readble(config.seek_events)) {
        const paths = await util.getFiles(config.seek_events)

        for (const p of paths) {
            require(p)
        }
    }

    if (await util.readble(config.seek_tasks)) {
        const paths = await util.getFiles(config.seek_tasks)

        for (const p of paths) {
            require(p)
        }
    }
}

cardinal.monitoring = async () => {
    if (config.redis_uri) {
        const event = require('./event')

        event.on(`${config.service}.cardinal`, async (message) => {
            if (message.action === 'reboot') {
                await cardinal.shutdown()
                await cardinal.boot(cardinal.app)
                console.info('cardinal: Reboot done!')
            }

            if (message.action === 'restart') {
                console.info('cardinal: Force restart from cardinal')
                process.exit(1)
            }
        })
    }
}

module.exports = cardinal
