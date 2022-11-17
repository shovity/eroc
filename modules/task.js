const kafka = require('./kafka')
const config = require('./config')

const tasks = {}

tasks.emit = (name, data) => {
    const topic = `tasks:${name}`.replaceAll(':', '.')
    kafka.pub(topic, data)
}

tasks.on = (name, handle) => {
    check(handle.constructor.name === 'AsyncFunction', 'Param handle must be a AsyncFunction')

    const topic = `tasks:${name}`.replaceAll(':', '.')

    const option = {
        group: `${config.service}:${config.env}:${topic}`,
        fb: true,
        retry: 1,
    }

    /**
     * Disable comsumer group and from beginning in local
     * then it's like event
     */
    if (config.env === 'local') {
        option.fb = false
        option.group += Date.now()
    }

    kafka.sub(topic, option, handle)
}

module.exports = tasks
