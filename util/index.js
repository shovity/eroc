const path = require('path')

const util = {}

const proxy = new Proxy(util, {

    get(target, prop, receiver) {
        const name = `${prop}U`
        
        // Load non-existent module to 'util'
        if (target[name] === undefined) {
            target[name] = require(path.join(__dirname, prop))
        }

        return target[prop]
    }
})


module.exports = proxy