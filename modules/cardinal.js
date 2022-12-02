const http = require('http')
const path = require('path')
const fs = require('fs').promises
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

    app.use(rio)
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.use(cors())

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

            if (error._message) {
                response.message = error._message
            }
        } else if (typeof error === 'string') {
            response.message = error
        }

        if (response.message.includes('code:')) {
            const [message, code] = response.message.split('code:')
            response.message = message.trim()
            response.code = `${config.service}.${code}`.trim()
        }

        console.error(error)
        return res.error(response)
    })

    if (config.api_monitor) {
        const expressListEndpoints = require('express-list-endpoints')

        console.log('eroc: 🧬 list apis')
        expressListEndpoints(app).forEach((api) => {
            api.methods.forEach((m) => console.log(`    ${m.padEnd(6)}${api.path}`))
        })
    }

    config.deferred.setup.resolve()
}

cardinal.boot = async () => {
    // Load remote config from redis
    if (config.redis_uri) {
        const rediser = require('./rediser')
        check(config.service, 'Missing config.service')
        Object.assign(config, await rediser.hget('eroc_config', '*'), await rediser.hget('eroc_config', config.service))
    }

    config.deferred.config.resolve()
    console.log(`eroc: 🍒 Load config done - service=${config.service}, env=${config.env}`)

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
    const rediser = require('./rediser')

    await Promise.all([mongoose.disconnect(), rediser.client.quit()])
}

cardinal.seek = async () => {
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

    if (await readable(config.seek_routers)) {
        try {
            const router = await scanner.router(config.seek_routers)
            cardinal.app.use(path.join('/', config.service), router)
        } catch (error) {
            console.log('eroc: ERROR - seek router false', error)
        }
    }

    if (await readable(config.seek_public)) {
        cardinal.app.use(express.static(path.join(config.app_dir, config.seek_public)))
    }

    if (await readable(config.seek_static)) {
        const match = path.join('/', config.service, 'static')

        cardinal.app.use(
            match,
            express.static(path.join(config.app_dir, config.seek_static), {
                maxAge: config.env === 'pro' ? '1y' : 0,
            }),
        )

        cardinal.app.use(match, async (req, res, next) => {
            res.status(404)
            return res.end('Static not found')
        })
    }

    if (await readable(config.seek_events)) {
        const paths = await util.getFiles(config.seek_events)

        for (const p of paths) {
            require(p)
        }
    }

    if (await readable(config.seek_tasks)) {
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
