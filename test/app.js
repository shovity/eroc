global.test = require('./test')
global.console.info = () => undefined
global.console.error = () => undefined

const prepare = async () => {
    const redis = require('redis')
    const client = redis.createClient({ url: 'redis://redis' })
    await client.connect()

    await client.hSet('eroc_config', '*', JSON.stringify({ remote_config_all: true }))
    await client.hSet('eroc_config', 'example', JSON.stringify({ remote_config_example: true }))

    client.quit()
}

const main = async () => {
    console.log('Preparing before boot application...')
    await test.sleep(1000)
    await prepare()

    const { create, config, logger } = require('eroc')

    test.start('load router')
    test.start('load task')
    test.start('load event')
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
