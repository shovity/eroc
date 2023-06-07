const config = require('./config')
const tx = require('./tx')

const logger = {
    transports: [],

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
        console: () => {
            return (data) => {
                const clone = Object.assign({}, data)
                delete clone.stack
                console.info(clone)

                data.stack && console.info(data.stack)
            }
        },

        /**
         * Pub log message to task (kafka)
         * Topic: 'logger.create'
         */
        task: () => {
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
    for (const transport of logger.transports) {
        if (transport.level && logger.level[transport.level] < logger.level[data.level]) {
            continue
        }

        if (transport.match && !transport.match.test(data.path)) {
            continue
        }

        transport.handle(data)
    }
}

const boot = async () => {
    await config.deferred.config

    // Build methods by levels
    for (const level of Object.keys(logger.level)) {
        logger[level] = (message, payload, extra) => {
            const data = prepare({ message, payload, level, ...extra })
            transporter(data)
        }
    }

    // Apply transporter
    for (const transporter of config.logger_transporter.split(',')) {
        const [name, level] = transporter.trim().split(':')

        if (!logger.transporter[name]) {
            console.error('logger: transporter not found:', name)
            continue
        }

        logger.transports.push({
            handle: logger.transporter[name](),
            level,
        })
    }
}

boot().catch((error) => {
    console.error('logger: boot error:', error)
})

module.exports = logger
