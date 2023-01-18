const config = require('./config')
const tx = require('./tx')

const logger = {
    transports: [],

    setting: {
        preset: config.logger_preset,
    },

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
}

const setting = logger.setting

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
        time: new Date().toISOString(),
    })

    if (!data.path) {
        try {
            data.path = Error().stack.split('at ')[3].split(` (${config.app_dir}/`)[1].split('.js:')[0]
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
    for (const level of Object.keys(logger.level)) {
        logger[level] = (message, payload, extra) => {
            const data = prepare({ message, payload, level, ...extra })
            transporter(data)
        }
    }

    for (const preset of setting.preset.split(',')) {
        if (preset === 'console') {
            logger.transports.push({
                handle: (data) => {
                    const stack = data.stack
                    delete data.stack
                    console.info(data)
                    stack && console.info(stack)
                },
            })

            continue
        }

        if (preset === 'task') {
            const task = require('./task')

            logger.transports.push({
                handle: (data) => {
                    task.emit('logger.create', data)
                },
            })
            
            continue
        }

        if (preset === 'slack') {
            const slack = require('./slack')

            logger.transports.push({
                level: 'crit',

                handle: (data) => {
                    slack.send(
                        `*System error - ${data.message}*\n` +
                        `- *URL:* ${data.url}\n` +
                        `- *SERVICE:* ${data.service}\n` +
                        `- *PATH:* ${data.path}\n` +
                        `- *ENV:* ${data.env}\n`,
                        {
                            color: '#dc3545'
                        }
                    )
                }
            })

            continue
        }

        console.error('logger: preset not found:', preset)
    }
}

boot().catch((error) => {
    console.error('logger: boot error:', error)
})

module.exports = logger
