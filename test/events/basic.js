const { event } = require('eroc')

test.check('load event')

event.on('hi', async (data) => {
    test.check('basic event', data === 1)
})

setTimeout(() => {
    test.start('basic event')
    event.emit('hi', 1)
}, 500)
