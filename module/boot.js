const config = require('./config')
const rediser = require('./rediser')


const boot = async (app) => {

    // Load remote config from redis
    if (config.redis_uri) {
        check(config.service, 'Missing config.service')
        const remoteConfig = await rediser.hget('eroc_config', config.service)
        Object.assign(config, remoteConfig)
    }

    console.log(`eroc: 🍒 Load config done - service=${config.service}, env=${config.env}`)

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
                console.log(`mongo: 🍱 Connected - ${config.mongo_uri}`)
            }).catch((error) => {
                console.error(error)
                console.error('mongo: connect to mongod error, reconnecting...')
                setTimeout(connect, 3000)
            })
        }
    
        mongoose.set('useFindAndModify', false)
        connect()
    }
}


module.exports = boot