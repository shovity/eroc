const { Router } = require('eroc')
const User = require('../../models/User')

const router = Router()

router.post('/', async (req, res, next) => {
    test.start('json body parser')
    test.check('json body parser', req.body !== undefined)

    const username = req.gp('username')

    const user = await User.create({ username })

    return res.success(user)
})

router.get('/', async (req, res, next) => {
    test.start('mount req.u')
    test.check('mount req.u', req.u !== undefined)

    test.start('mount req.gp')
    test.check('mount req.gp', req.gp !== undefined)

    test.start('mount res.success')
    test.check('mount res.success', res.success !== undefined)

    test.start('mount res.error')
    test.check('mount res.error', res.error !== undefined)

    test.start('cookie parse')
    test.check('cookie parse', req.cookies !== undefined)

    const username = req.gp('username')

    const query = {
        username,
    }

    const user = await User.findOne(query)

    return res.success(user)
})

module.exports = router
