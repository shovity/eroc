const http = require('http')
const path = require('path')
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const exphbs = require('express-handlebars')
const config = require('./config')
const scanner = require('./scanner')
const util = require('./util')

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
        console.log('eroc: ERROR - Setup application failed:', error)
    })

    if (config.port) {
        server.listen(config.port, () => {
            console.log('eroc: 🍔 HTTP server ready!')
        })
    }

    return { app, server }
}

cardinal.setup = async (middle) => {
    const vanguard = require('./vanguard')
    const rio = require('./rio')
    const app = cardinal.app
    const hbs = exphbs.create({ extname: 'html' })

    app.engine('html', hbs.engine)
    app.set('views', path.resolve(config.app_dir, config.seek_views))
    app.set('view engine', 'html')

    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.use(cors())

    // gp success error
    app.use(rio.base())
    // u
    app.use(rio.util())
    // auth
    app.use(rio.auth())

    await cardinal.boot()

    app.use(vanguard.detect())

    middle && middle(app)?.catch(console.error)

    await cardinal.seek()
    await cardinal.monitoring()

    // Catch 404 route
    app.use((req, res, next) => {
        return res.error(
            {
                message: '404 Not found',
                service: config.service,
                url: req.originalUrl,
                method: req.method,
                env: config.env,
            },
            {
                code: 404,
            },
        )
    })

    // Top level handle exception
    app.use((error, req, res, next) => {
        // Handle express error
        // error throw from sync handle and next(err)

        const response = {
            message: 'Unknow error',
            service: config.service,
            url: req.originalUrl,
            method: req.method,
            env: config.env,
            level: 'fatal',
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

        return res.status(400).json({ error: response })
    })

    if (config.api_monitor) {
        const ele = require('express-list-endpoints')

        console.log('eroc: 🧬 list apis')
        ele(app).forEach((api) => {
            api.methods.forEach((m) => console.log(`    ${m.padEnd(6)}${api.path}`))
        })
    }

    config.deferred.setup.resolve()
}

cardinal.boot = async () => {
    // Load config.js
    if (await util.readble(path.join(config.app_dir, 'config.js'))) {
        const handle = require(path.join(config.app_dir, 'config.js'))

        if (typeof handle === 'function') {
            handle(config)
        } else {
            console.error('cardinal: config.js must be a function')
        }
    }

    // Override reids_uri from environment
    if (process.env.REDIS_URI) {
        config.redis_uri = process.env.REDIS_URI
    }

    // Load centralized configuration
    if (config.redis_uri) {
        const rediser = require('./rediser')
        check(config.service, 'Missing config.service')
        Object.assign(config, await rediser.hget('eroc_config', '*'), await rediser.hget('eroc_config', config.service))
    }

    // Load project config.override.js
    if (await util.readble(path.join(config.app_dir, 'config.override.js'))) {
        const handle = require(path.join(config.app_dir, 'config.override.js'))

        if (typeof handle === 'function') {
            handle(config)
        } else {
            console.error('cardinal: config.override.js must be a function')
        }
    }

    console.log(`eroc: 🍒 Load config done - service=${config.service}, env=${config.env}`)
    config.deferred.config.resolve()

    // Check required config
    check(config.service, 'Missing config.service')

    if (config.mongo_uri) {
        const mongoose = require('mongoose')

        const connect = () => {
            mongoose
                .connect(config.mongo_uri, {
                    useUnifiedTopology: true,
                    useNewUrlParser: true,
                    useCreateIndex: true,

                    auth: {
                        authSource: 'admin',
                    },
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

        mongoose.set('useFindAndModify', false)
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
            const router = await scanner.router(config.seek_routers)
            cardinal.app.use(path.join('/', config.service), router)
        } catch (error) {
            console.log('eroc: ERROR - seek router false', error)
        }
    }

    if (await util.readble(config.seek_public)) {
        cardinal.app.use(express.static(path.join(config.app_dir, config.seek_public)))
    }

    if (await util.readble(config.seek_static)) {
        const match = path.join('/', config.service, 'static')

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
                console.info('eroc: Reboot done!')
            }

            if (message.action === 'restart') {
                console.info('Force restart from cardinal')
                process.exit(1)
            }
        })
    }
}

module.exports = cardinal
