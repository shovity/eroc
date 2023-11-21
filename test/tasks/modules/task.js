const { task, logger } = require('eroc')

test.check('task load')

task.on('hi', async (data) => {
    test.check('task basic', data === 1)

    test.start('logger path:tasks/modules/task:inner handle')
    logger.info('logger path:tasks/modules/task:inner handle')
})

setTimeout(() => {
    test.start('task basic')
    task.emit('hi', 1)
}, 3000)

test.start('logger path:tasks/modules/task:outer handle')
logger.info('logger path:tasks/modules/task:outer handle')
