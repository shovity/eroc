const { resolve } = require('path')
const { readdir } = require('fs').promises

const Router = require('./Router')
const config = require('./config')
const util = require('./util')


const scanner = {}

scanner.router = async (dir) => {
    const router = Router()

    const paths = (await util.getFiles(dir)).filter((path) => {
        return /^[^_].*\.js$/.test(path.split('/').pop())
    })

    for (const path of paths) {
        const module = require(path)
        const matchs = path.slice(resolve(dir).length, -3).split('/')

        if (typeof module !== 'function') {
            console.warn(`eroc - warn: router not a function - ${path}`)
            continue
        }

        // console.log(`eroc: load ${matchs.join('/')}`)

        if (['^', '~'].includes(matchs[matchs.length - 1][0])) {
            matchs.pop()
        }

        router.use(matchs.join('/'), module)
    }

    return router
}


module.exports = scanner