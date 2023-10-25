const config = require('./config')
const tx = require('./tx')

const logger = {
    transports: [],
    buffers: [],
    ready: false,

    // Ordering specified by RFC5424
    level: {
        emerg: 0,
        alert: 1,
        crit: 2,
        error: 3,
        warn: 4,
        notice: 5,
        info: 6,
        debug: 7,
    },

    transporter: {
        /**
         * Print message to console
         */
        console: async () => {
            return (data) => {
                const clone = Object.assign({}, data)
                delete clone.stack
                console.error(clone)

                data.stack && console.error(data.stack)
            }
        },

        /**
         * Pub log message to task (kafka)
         * Topic: 'logger.create'
         */
        task: async () => {
            const task = require('./task')

            return (data) => {
                process.nextTick(task.emit, 'logger.create', data)
            }
        },
    },
}

const prepare = (data) => {
    if (data.message instanceof Error) {
        data.payload = Object.assign({}, data.message)
        data.message = data.message.message
    }

    check(typeof data.message === 'string', 'logger: message must be typeof string or instanceof Error')

    Object.assign(data, {
        service: config.service,
        env: config.env,
        url: tx.get('url'),
        method: tx.get('method'),
        txid: tx.get('txid'),
        uid: tx.get('uid'),
        time: new Date().toISOString(),
    })

    if (!data.path) {
        try {
            const paths = (data.stack || Error().stack).split('at ')
            let pick = 3

            if (paths[1].startsWith('global.check')) {
                pick = 2
            }

            data.path = paths[pick].split(`${config.app_dir}/`).slice(1).join('').split('.js:')[0]
        } catch (error) {
            console.error('logger: extract path failed:', Error())
        }
    }

    if (!data.stack) {
        data.stack = data.message?.stack
    }

    return data
}

const transporter = (data) => {
    // If logger not ready because some transporter need to wait 
    // for configuration or connection then push log to buffer and handle later
    if (!logger.ready) {
        logger.buffers.push(data)
    }

    for (const transport of logger.transports) {
        if (transport.level && logger.level[transport.level] < logger.level[data.level]) {
            continue
        }

        transport.handle(data)
    }
}

/**
 * Build methods by levels, all methods can use Immediate
 * by buffer supported
 */
for (const level of Object.keys(logger.level)) {
    logger[level] = (message, payload, extra) => {
        const data = prepare({ message, payload, level, ...extra })
        transporter(data)
    }
}

const boot = async () => {
    await config.deferred.config

    // Apply transporter
    for (const transporter of config.logger_transporter.split(',')) {
        const [name, level] = transporter.trim().split(':')

        if (!logger.transporter[name]) {
            console.error('logger: transporter not found:', name)
            continue
        }

        logger.transports.push({
            handle: await logger.transporter[name](),
            level,
        })
    }

    logger.ready = true

    // Handle buffed log
    for (const data of logger.buffers) {
        transporter(data)
    }
}

boot().catch((error) => {
    console.error('logger: boot error:', error)
})

module.exports = logger
