const { resolve } = require('path')
const { readdir } = require('fs').promises

const util = {}

util.getFiles = async (dir) => {
    const dirents = await readdir(dir, { withFileTypes: true })

    const files = await Promise.all(
        dirents.map((dirent) => {
            const res = resolve(dir, dirent.name)
            return dirent.isDirectory() ? util.getFiles(res) : res
        }),
    )

    return [].concat(...files)
}

util.intersect = (target, destination) => {
    if (!Array.isArray(target)) {
        return
    }

    return destination.find((e) => target.indexOf(e) !== -1)
}

module.exports = util
