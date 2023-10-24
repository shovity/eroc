const { Router } = require('eroc')

const router = Router()

router.use(async (req, res, next) => {
    test.check('routers middleware')
    next()
})

module.exports = router

test.check('load router')
