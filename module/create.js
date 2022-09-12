const http = require('http')
const path = require('path')
const fs = require('fs').promises
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const exphbs = require('express-handlebars')
const expressListEndpoints = require('express-list-endpoints')

const scan = require('./scan')
const config = require('./config')
const rio = require('./rio')
// const ruler = require('./ruler')


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

const load = async (app) => {
    
    if (await readable(config.scan.router)) {
        const router = await scan('router', config.scan.router)
        app.use(path.join('/', config.service), router)
    }

    if (await readable(config.scan.public)) {
        app.use(express.static(path.join(config.app_dir, config.scan.public)))
    }

    if (await readable(config.scan.static)) {
        const match = path.join('/', config.service, 'static')

        app.use(match, express.static(path.join(config.app_dir, config.scan.static)))

        app.use(match, async (req, res, next) => {
            res.status(404)
            return res.end('Static not found')
        })
    }
}

module.exports = (middle) => {

    // Check required config before init application
    check(config.service, 'Missing config.service')
    check(config.env, 'Missing config.env')
    check(config.secret_key, 'Missing config.secret_key')

    const app = express()

    const hbs = exphbs.create({
        extname: 'html',
        helpers: {
            stringify: (data) => {
                return JSON.stringify(data)
            }
        }
    })

    app.engine('html', hbs.engine)
    app.set('views', path.resolve(config.app_dir, 'views'))
    app.set('view engine', 'html')

    app.use(rio)
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.use(cors())
    // app.use(ruler.detect())

    if (middle) {
        if (middle.constructor.name === 'AsyncFunction') {
            middle(app).catch(console.error)
        } else {
            middle(app)
        }
    }

    load(app).then(() => {

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
            // handle express error
            // error throw from sync handle and next(err)

            const response = {
                message: error.message || error || 'server error',
                service: config.service,
                url: req.originalUrl,
                method: req.method,
                env: config.env,
                level: 'fatal',
            }

            if (typeof error === 'object') {
                Object.assign(response, error)
            }

            console.error(response)
            console.error(error)

            return res.error(response)
        })

        if (config.api_monitor) {
            console.log('eroc: 🧬 list apis')
            expressListEndpoints(app).forEach((api) => {
                api.methods.forEach((m) => console.log(`    ${m.padEnd(6)}${api.path}`))
            })
        }
    }).catch((error) => {
        console.log('eroc: Load modules failed', error)
    })

    const server = http.createServer(app)

    server.listen(config.port, () => {
        console.log(`eroc: 🍑 Service "${config.service}" is started`)
    })

    return { app, server }
}