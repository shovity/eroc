const { jwt } = require('eroc')

const main = async () => {
    test.start('jwt signing')
    const token = await jwt.sign({ name: 'Gojo' })
    test.check('jwt signing', token.length)

    test.start('jwt verify')
    const data = await jwt.verify(token)
    test.check('jwt verify', data.name === 'Gojo')

    test.start('jwt invalid secret')
    jwt.verify(token, { secret: 'incorect_scret' })
        .then(() => {
            test.check('jwt invalid secret', false)
        })
        .catch(() => {
            test.check('jwt invalid secret')
        })
}

main().catch(console.log)
