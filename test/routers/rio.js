const { Router, request } = require('eroc')

const router = Router()

router.post('/', async (req, res, next) => {
    const require = req.gp('require')
    const string = req.gp('string', 1, String)
    const regex = req.gp('regex', null, /[ab]/)
    const option = req.gp('option', null, [1, 2])
    const option2 = req.gp('option2', null, { a: 1, b: 2 })

    const fun = req.gp('fun', null, (value, key) => {
        value = Number(value)
        
        check(value > 0, `${key} must greater than 0`)

        return value
    })

    return res.success({
        require,
        string,
        regex,
        option,
        option2,
        fun,
    })
})

setTimeout(() => {
    test.start('rio.gp require')
    request.post('example/rio').catch((error) => {
        test.check('rio.gp require')
    })

    test.start('rio.gp default')
    request.post('example/rio', { require: 1 }).then(({ data }) => {
        test.check('rio.gp default', data.string === 1)
    })

    test.start('rio.gp convert')
    request.post('example/rio', { require: 1, string: 2 }).then(({ data }) => {
        test.check('rio.gp convert')
    })

    test.start('rio.gp regex fail')
    request.post('example/rio', { require: 1, regex: 2 }).catch((error) => {
        test.check('rio.gp regex fail')
    })

    test.start('rio.gp regex pass')
    request.post('example/rio', { require: 1, regex: 'b' }).then(() => {
        test.check('rio.gp regex pass')
    })

    test.start('rio.gp array option fail')
    request.post('example/rio', { require: 1, option: 3 }).catch((error) => {
        test.check('rio.gp array option fail')
    })

    test.start('rio.gp array option pass')
    request.post('example/rio', { require: 1, option: 1 }).then(() => {
        test.check('rio.gp array option pass')
    })

    test.start('rio.gp object option fail')
    request.post('example/rio', { require: 1, option2: 3 }).catch((error) => {
        test.check('rio.gp object option fail')
    })

    test.start('rio.gp object option pass')
    request.post('example/rio', { require: 1, option2: 2 }).then(() => {
        test.check('rio.gp object option pass')
    })

    test.start('rio.gp fun fail')
    request.post('example/rio', { require: 1, fun: -1 }).catch((error) => {
        test.check('rio.gp fun fail')
    })

    test.start('rio.gp fun pass')
    request.post('example/rio', { require: 1, fun: '1' }).then(() => {
        test.check('rio.gp fun pass')
    })

}, 500)

module.exports = router
