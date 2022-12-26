const fs = require('fs')
const path = require('path')
const util = require('./util')

const config = {}

Object.assign(config, {
    app_dir: path.dirname(require.main.filename),
    port: 3000,
    env: 'local',
    secret: 'terces',
    seek_static: 'static',
    seek_public: 'public',
    seek_views: 'views',
    seek_tasks: 'tasks',
    seek_routers: 'routers',
    seek_events: 'events',
    deferred: {},
})

config.deferred.config = util.deferred()
config.deferred.setup = util.deferred()

const package = require(path.join(config.app_dir, 'package.json'))
config.service = package.name

// Load config.js
if (fs.existsSync(path.join(config.app_dir, 'config.js'))) {
    const handle = require(path.join(config.app_dir, 'config.js'))

    if (typeof handle === 'function') {
        handle(config)
    } else {
        console.error('config: config.js must be a function')
    }
}

const main = async () => {
    // Override reids_uri from environment
    if (process.env.REDIS_URI) {
        config.redis_uri = process.env.REDIS_URI
    }

    // Load centralized configuration
    if (config.redis_uri) {
        const redis = require('redis')
        check(config.service, 'Missing config.service')

        const client = redis.createClient({ url: config.redis_uri })
        client.connect()

        const rcs = await client.multi().hGet('eroc_config', '*').hGet('eroc_config', config.service).exec()

        for (const rc of rcs) {
            Object.assign(config, JSON.parse(rc))
        }

        client.quit()
    }

    // Load project config.override.js
    if (fs.existsSync(path.join(config.app_dir, 'config.override.js'))) {
        const handle = require(path.join(config.app_dir, 'config.override.js'))

        if (typeof handle === 'function') {
            handle(config)
        } else {
            console.error('config: config.override.js must be a function')
        }
    }

    console.info(`config: 🍒 Load config done - service=${config.service}, env=${config.env}`)
    config.deferred.config.resolve()
}

main().catch((error) => {
    console.error('config: Load config error', error)
})

module.exports = config
