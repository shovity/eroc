const { event, logger } = require('eroc')

test.check('event load')

event.on('hi', async (data) => {
    test.check('event basic', data === 1)

    test.start('logger path:events/event:inner handle')
    logger.info('logger path:events/event:inner handle')
})

setTimeout(() => {
    test.start('event basic')
    event.emit('hi', 1)
}, 500)

test.start('logger path:events/event:outer handle')
logger.info('logger path:events/event:outer handle')
