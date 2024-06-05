const { resolve } = require('node:path')
const Router = require('./Router')
const util = require('./util')
const config = require('./config')

const scanner = {}

scanner.router = async (dir) => {
    const router = Router()
    const paths = []

    for (const path of await util.getFiles(dir)) {
        if (!/^[a-z][a-z0-9-]+\.(j|t)s$/.test(path.split('/').pop())) {
            continue
        }

        if (path.endsWith('/index.js') || path.endsWith('/index.ts')) {
            paths.push(path.slice(0, -9))
        } else {
            paths.push(path.slice(0, -3))
        }
    }

    paths.sort()

    for (const path of paths) {
        const module = require(path)
        const handle = module.default || module

        const matchs = path.slice(resolve(dir).length).split('/')

        if (typeof handle !== 'function') {
            console.warn(`eroc - warn: router not a function - ${path}`)
            continue
        }

        router.use(matchs.join('/'), handle)
    }

    return { router, paths }
}

scanner.event = async () => {
    const dir = config.seek_events

    if (await util.readble(dir)) {
        for (const path of await util.getFiles(dir)) {
            require(path)
        }
    }
}

scanner.task = async () => {
    const dir = config.seek_tasks

    if (await util.readble(dir)) {
        for (const path of await util.getFiles(dir)) {
            require(path)
        }
    }
}

module.exports = scanner
