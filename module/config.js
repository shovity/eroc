const fs = require('fs')
const path = require('path')
const Event = require('events')


const config = new Event()

Object.assign(config, {
    app_dir: path.dirname(require.main.filename),
    port: 3000,
    scan_router: 'router',
    scan_static: 'static',
    scan_public: 'public',
    scan_views: 'views'
})

// Load project config.js
if (fs.existsSync(path.join(config.app_dir, 'config.js'))) {
    require(path.join(config.app_dir, 'config.js'))(config)
}


module.exports = config