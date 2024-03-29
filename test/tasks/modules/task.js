const { task, logger } = require('eroc')

test.check('task load')

task.on('hi', async (data) => {
    test.check('task basic', data === 1)

    test.start('logger path:tasks/modules/task:inner handle')
    logger.info('logger path:tasks/modules/task:inner handle')
})

task.on('test1', async (data, meta) => {
    if (meta.trips.lastIndexOf('test1') > 0) {
        test.check('task trip', true)
        return
    }

    task.emit('test2')
})

task.on('test2', async (data, meta) => {
    task.emit('test3')
})

task.on('test3', async (data, meta) => {
    task.emit('test1')
})

setTimeout(() => {
    test.start('task basic')
    task.emit('hi', 1)

    test.start('task trip')
    task.emit('test1')
}, 3000)

test.start('logger path:tasks/modules/task:outer handle')
logger.info('logger path:tasks/modules/task:outer handle')
