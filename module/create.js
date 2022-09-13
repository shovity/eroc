const http = require('http')
const path = require('path')
const Event = require('events')
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const exphbs = require('express-handlebars')

const boot = require('./boot')
const seek = require('./seek')
const config = require('./config')
const rio = require('./rio')


const create = (middle) => {
    const app = express()
    const hbs = exphbs.create({ extname: 'html' })

    app.engine('html', hbs.engine)
    app.set('views', path.resolve(config.app_dir, config.scan_views))
    app.set('view engine', 'html')

    app.use(rio)
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.use(cors())
    // app.use(ruler.detect())

    Promise.all([
        boot(app),
        seek(app),
    ]).then(() => {

        // Check required config before init application
        check(config.service, 'Missing config.service')
        check(config.env, 'Missing config.env')
        check(config.secret_key, 'Missing config.secret_key')

        app.u = new Event()

        app.u.on('reboot', () => {
            boot(app).then(() => {
                console.log('eroc: Reboot done!')
            }).catch((error) => {
                console.log('ERROR - eroc: Reboot failed:', error)
            })
        })

        middle && middle(app)?.catch(console.error)

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
            const expressListEndpoints = require('express-list-endpoints')
            
            console.log('eroc: 🧬 list apis')
            expressListEndpoints(app).forEach((api) => {
                api.methods.forEach((m) => console.log(`    ${m.padEnd(6)}${api.path}`))
            })
        }
    }).catch((error) => {
        console.log('ERROR - eroc: Setup application failed:', error)
    })

    const server = http.createServer(app)

    server.listen(config.port, () => {
        console.log('eroc: 🍔 HTTP server ready!')
    })

    return { app, server }
}


module.exports = create