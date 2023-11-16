const { counter } = require('eroc')

const main = async () => {
    const start = await counter.get('counter_key')

    test.start('counter get')

    const next = await counter.get('counter_key')
    test.check('counter get', start + 1 === next)

    test.start('counter set')
    await counter.set('counter_key', 0)
    test.check('counter set', (await counter.get('counter_key')) === 1)
}

main().catch(console.error)
