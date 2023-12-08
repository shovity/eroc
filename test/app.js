global.test = require('./test')
global.console.info = () => undefined

// Comment under line to debug
global.console.error = () => undefined

const prepare = async () => {
    const redis = require('redis')
    const client = redis.createClient({ url: 'redis://redis' })
    await client.connect()

    await client.hSet('eroc:service', '*', 'return { remote_config_all: true }')
    await client.hSet('eroc:service', 'example', 'return { remote_config_example: true }')

    client.quit()
}

const main = async () => {
    console.log('Preparing before boot application...')
    await test.sleep(1000)
    await prepare()

    const { create, config, logger } = require('eroc')

    test.start('router load')
    test.start('task load')
    test.start('event load')
    test.start('routers middleware')
    test.start('setup application')
    test.start('remote config all')
    test.start('remove config instance')

    create()

    config.deferred.config.then(async () => {
        test.check('remote config all', config.remote_config_all === true)
        test.check('remove config instance', config.remote_config_example === true)
    })

    config.deferred.setup.then(async () => {
        test.check('setup application')
    })

    test.start('logger path:app')
    logger.info('logger path:app')
}

main().catch(console.log)
