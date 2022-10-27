const path = require('path')

const util = {}

const proxy = new Proxy(util, {

    get(target, prop, receiver) {

        // Load non-existent module to 'util'
        if (target[prop] === undefined) {
            target[prop] = require(path.join(__dirname, prop))
        }

        return target[prop]
    }
})


module.exports = proxy