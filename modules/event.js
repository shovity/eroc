const rediser = require('./rediser')
const config = require('./config')

const event = {}

event.emit = (name, data) => {
    const channel = `event:${name}`
    rediser.pub(channel, data)
}

event.on = (name, handle) => {
    check(handle.constructor.name === 'AsyncFunction', 'Param handle must be a AsyncFunction')

    const channel = `event:${name}`

    const wrap = (data) => {
        handle(data)
            .then(() => {
                //
            })
            .catch((error) => {
                console.error('Handle event failed', error)
            })
    }

    rediser.sub(channel, wrap)
}

module.exports = event
