const { task } = require('eroc')

test.check('load task')

task.on('hi', async (data) => {
    test.check('basic task', data === 1)
})

setTimeout(() => {
    test.start('basic task')
    task.emit('hi', 1)
}, 3000)
