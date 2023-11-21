const { request } = require('eroc')
const User = require('../../models/User')

const main = async () => {
    const user = await User.create({ username: 'Toge' })

    test.start('query')

    const { data } = await request.post('example/in/query/User', {
        findOne: {
            username: user.username,
        },
    })

    test.check('query', data.username === user.username)
}

main().catch(console.error)
