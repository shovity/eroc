const path = require('path')


global.check = (condition, message, code) => {
    
    if (!condition) {
        const error = {}

        error.message = message

        if (code) {
            error.code = code
        }

        throw error
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