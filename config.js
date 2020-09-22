/**
 * Available key .env
 * service
 * env
 * port
 * requester_service_base
 * secret_key
 * client
 * websocket_emitter_hook
 * websocket_client
 * slacker_token
 * mongo_uri
 * 
 * Available project config.js
 * clients
 */


const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')


const config = {}
const env = dotenv.config({ path: path.join(__dirname, '../../.env') }).parsed
const envOverride = dotenv.config({ path: path.join(__dirname, '../../.env.override') }).parsed

// load .env
Object.keys(env || {}).forEach((key) => {
    if (process.env[key] === undefined) {
        process.env[key] = env[key]
        config[key.toLowerCase()] = env[key]
    } else {
        config[key.toLowerCase()] = process.env[key]
    }
})

// merge .env.override
Object.keys(envOverride || {}).forEach((key) => {
    process.env[key] = envOverride[key]
    config[key.toLowerCase()] = envOverride[key]
})

// merge project config.js
if (fs.existsSync(path.join(__dirname, '../../config.js'))) {
    require('../../config')(config)
}

// connect mongoose if truly config.mongo_uri
if (config.mongo_uri) {
    const mongoose = require('mongoose')

    mongoose.set('useFindAndModify', false)
    
    mongoose.connect(config.mongo_uri, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useCreateIndex: true,
    
        auth: {
            authSource: 'admin',
        },
    })

    mongoose.connection.on('error', error => console.error('BOOT: mongodb connect error', error))
    mongoose.connection.once('open', () => console.log(`BOOT: 🍱 mongodb connected - mongo_uri=${config.mongo_uri}`))
    
}

console.log(`BOOT: 🚀 load config done - env=${config.env}`)


module.exports = config