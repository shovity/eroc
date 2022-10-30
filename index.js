const path = require('path')


global.check = (condition, message) => {
    if (!condition) {
        throw typeof message === 'string' ? Error(message) : message
    }
}

const eroc = {}

const proxy = new Proxy(eroc, {

    get(target, prop, receiver) {

        // Load non-existent module to 'eroc'
        if (target[prop] === undefined) {
            target[prop] = require(path.join(__dirname, `modules/${prop}`))
        }

        return target[prop]
    }
})


module.exports = proxy