const path = require('path')
const util = require('./util')

const config = {}

Object.assign(config, {
    app_dir: path.dirname(require.main.filename),
    port: 3000,
    env: 'dev',
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

module.exports = config
