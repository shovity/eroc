const path = require('path')
const fs = require('fs').promises
const express = require('express')

const config = require('./config')
const rediser = require('./rediser')
const scanner = require('./scanner')
const util = require('./util')


const cardinal = {}

cardinal.boot = async (app) => {

    // Load remote config from redis
    if (config.redis_uri) {
        check(config.service, 'Missing config.service')

        Object.assign(
            config,
            await rediser.hget('eroc_config', '*'),
            await rediser.hget('eroc_config', config.service),
        )
    }

    // Check required config
    check(config.service, 'Missing config.service')
    check(config.env, 'Missing config.env')
    check(config.secret, 'Missing config.secret')

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

cardinal.seek = async (app) => {

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
            app.use(path.join('/', config.service), router)
        } catch (error) {
            console.log('eroc: ERROR - seek router false', error)
        }
    }

    if (await readable(config.seek_public)) {
        app.use(express.static(path.join(config.app_dir, config.seek_public)))
    }

    if (await readable(config.seek_static)) {
        const match = path.join('/', config.service, 'static')

        app.use(match, express.static(path.join(config.app_dir, config.seek_static)))

        app.use(match, async (req, res, next) => {
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

cardinal.monitoring = async (app) => {

    rediser.sub(`service:${config.service}`, (message) => {
        if (message.action === 'reboot') {
            cardinal.boot(app).then(() => {
                console.log('eroc: Reboot done!')
            }).catch((error) => {
                console.log('eroc: ERROR - Reboot failed:', error)
            })
        }

        if (message.action === 'restart') {
            throw 'Force restart from remoter'
        }
    })
}


module.exports = cardinal