const config = require('./config')
const tx = require('./tx')

const logger = {}

const prepare = (data) => {
    Object.assign(data, {
        url: tx.get('url'),
        method: tx.get('method'),
        txid: tx.get('txid'),
        time: new Date().toISOString(),
        path: new Error().stack.split('at ')[3].split(config.app_dir)[1].split('.js:')[0].slice(1),
    })

    return data
}

const handler = (data) => {
    console[data.level](data.message)
    // console.log(data)
}

logger.debug = (message) => {
    const data = prepare({ message, level: 'debug' })
    handler(data)
}

logger.info = (message) => {
    const data = prepare({ message, level: 'info' })
    handler(data)
}

logger.error = (message) => {
    const data = prepare({ message, level: 'error' })
    handler(data)
}

module.exports = logger
