const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')


const config = {
    app_dir: path.dirname(require.main.filename),
    port: 3000,

    scan: {
        router: 'router',
        static: 'static',
        public: 'public',
    },
}

const env = dotenv.config({ path: path.join(config.app_dir, '.env') }).parsed

// Load project config.js
if (fs.existsSync(path.join(config.app_dir, 'config.js'))) {
    require(path.join(config.app_dir, 'config.js'))(config)
}

// Load .env to config
Object.keys(env || {}).forEach((key) => {
    config[key] = env[key]
})

// Connect mongoose if has config.mongo_uri
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
            console.log(`mongo: 🍱 Connected ${config.mongo_uri}`)
        }).catch((error) => {
            console.error(error)
            console.error('mongo: connect to mongod error, reconnecting...')
            setTimeout(connect, 3000)
        })
    }

    mongoose.set('useFindAndModify', false)
    connect()
}

console.log(`eroc: 🚀 Load config done - env=${config.env}`)


module.exports = config