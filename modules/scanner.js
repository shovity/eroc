const { resolve } = require('node:path')
const Router = require('./Router')
const util = require('./util')
const config = require('./config')

const scanner = {}

scanner.router = async (dir) => {
    const router = Router()
    const paths = []

    for (let path of await util.getFiles(dir)) {
        if (!/^[a-z][a-z0-9-]+\.js$/.test(path.split('/').pop())) {
            continue
        }

        if (path.endsWith('/index.js')) {
            path = path.slice(0, -9)
        } else {
            path = path.slice(0, -3)
        }

        if (config.flag_control) {
            const redis = require('./redis')
            const key = `router.${config.service}.${path.slice(resolve(dir).length + 1)}`
            const flag = await redis.hget('flag', key)

            if (flag === 'inactive') {
                continue
            }

            if (flag === null) {
                redis.hset('flag', key, 'active')
            }
        }

        paths.push(path)
    }

    paths.sort()

    for (const path of paths) {
        const module = require(path)
        const matchs = path.slice(resolve(dir).length).split('/')

        if (typeof module !== 'function') {
            console.warn(`eroc - warn: router not a function - ${path}`)
            continue
        }

        router.use(matchs.join('/'), module)
    }

    return { router, paths }
}

scanner.event = async () => {
    const dir = config.seek_events

    if (await util.readble(dir)) {
        for (const path of await util.getFiles(dir)) {
            if (config.flag_control) {
                const redis = require('./redis')
                const key = `event.${config.service}.${path.slice(resolve(dir).length + 1, -3)}`
                const flag = await redis.hget('flag', key)

                if (flag === 'inactive') {
                    continue
                }

                if (flag === null) {
                    redis.hset('flag', key, 'active')
                }
            }

            require(path)
        }
    }
}

scanner.task = async () => {
    const dir = config.seek_tasks

    if (await util.readble(dir)) {
        for (const path of await util.getFiles(dir)) {
            if (config.flag_control) {
                const redis = require('./redis')
                const key = `task.${config.service}.${path.slice(resolve(dir).length + 1, -3)}`
                const flag = await redis.hget('flag', key)

                if (flag === 'inactive') {
                    continue
                }

                if (flag === null) {
                    redis.hset('flag', key, 'active')
                }
            }

            require(path)
        }
    }
}

module.exports = scanner
