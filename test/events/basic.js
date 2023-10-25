const { event, logger } = require('eroc')

test.check('load event')

event.on('hi', async (data) => {
    test.check('basic event', data === 1)

    test.start('logger path:events/basic:inner handle')
    logger.info('logger path:events/basic:inner handle')
})

setTimeout(() => {
    test.start('basic event')
    event.emit('hi', 1)
}, 500)

test.start('logger path:events/basic:outer handle')
logger.info('logger path:events/basic:outer handle')
