const { counter } = require('eroc')

const main = async () => {
    const start = await counter.get('counter_key')

    test.start('counter')

    const next = await counter.get('counter_key')
    test.check('counter', start + 1 === next)
}

main().catch(console.error)
