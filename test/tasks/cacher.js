const { request } = require('eroc')

const main = async () => {
    await request.get('/example/cacher')
    await test.sleep(100)

    test.start('cacher middle')
    const { data } = await request.get('/example/cacher')
    test.check('cacher middle', Date.now() - data > 100)
}

main().catch(console.log)
