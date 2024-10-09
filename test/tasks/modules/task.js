const { task, logger } = require('eroc')

test.check('task load')

task.on('hi', async (data) => {
  test.check('task basic', data === 1)

  test.start('logger path:tasks/modules/task:inner handle')
  logger.info('logger path:tasks/modules/task:inner handle')
})

task.on('trip_1', async (_, meta) => {
  if (meta.loop) {
    test.check('task trip', meta.trips.length === 4)
    return
  }

  task.emit('trip_2')
})

task.on('trip_2', async () => {
  task.emit('trip_3')
})

task.on('trip_3', async () => {
  task.emit('trip_1')
})

setTimeout(() => {
  test.start('task basic')
  task.emit('hi', 1)

  test.start('task trip')
  task.emit('trip_1')
}, 3000)

test.start('logger path:tasks/modules/task:outer handle')
logger.info('logger path:tasks/modules/task:outer handle')
