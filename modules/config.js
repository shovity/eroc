const fs = require('fs')
const path = require('path')
const Event = require('events')


const config = new Event()

Object.assign(config, {
    app_dir: path.dirname(require.main.filename),
    port: 3000,
    seek_static: 'static',
    seek_public: 'public',
    seek_views: 'views',
    seek_tasks: 'tasks',
    seek_routers: 'routers',
    seek_events: 'events',
})

// Load project config.js
if (fs.existsSync(path.join(config.app_dir, 'config.js'))) {
    require(path.join(config.app_dir, 'config.js'))(config)
}


module.exports = config