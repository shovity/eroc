const { resolve } = require('path')
const Router = require('./Router')
const util = require('./util')

const scanner = {}

scanner.router = async (dir) => {
    const router = Router()

    const paths = (await util.getFiles(dir))
        .filter((path) => {
            return /^[a-z][a-z0-9-]+\.js$/.test(path.split('/').pop())
        })
        .map((path) => {
            if (path.endsWith('/index.js')) {
                return path.slice(0, -9)
            }

            return path.slice(0, -3)
        })
        .sort()

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

module.exports = scanner
