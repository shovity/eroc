const path = require('path')

const util = {}

const proxy = new Proxy(util, {
    get(target, prop) {
        const name = prop.slice(0, -1)

        // Load non-existent module to 'util'
        if (target[name] === undefined) {
            target[name] = require(path.join(__dirname, name))
        }

        return target[name]
    },
})

module.exports = proxy