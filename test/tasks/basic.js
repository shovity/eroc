const { task, logger } = require('eroc')

test.check('load task')

task.on('hi', async (data) => {
    test.check('basic task', data === 1)

    test.start('logger path:tasks/basic:inner handle')
    logger.info('logger path:tasks/basic:inner handle')
})

setTimeout(() => {
    test.start('basic task')
    task.emit('hi', 1)
}, 3000)

test.start('logger path:tasks/basic:outer handle')
logger.info('logger path:tasks/basic:outer handle')
