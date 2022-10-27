const { resolve } = require('path')
const { readdir } = require('fs').promises


const util = {}


util.getFiles = async (dir) => {
    const dirents = await readdir(dir, { withFileTypes: true })

    const files = await Promise.all(dirents.map((dirent) => {
        const res = resolve(dir, dirent.name)
        return dirent.isDirectory() ? util.getFiles(res) : res
    }))

    return [].concat(...files)
}


module.exports = util