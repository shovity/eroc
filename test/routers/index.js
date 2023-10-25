const { Router, logger } = require('eroc')

const router = Router()

router.use(async (req, res, next) => {
    test.check('routers middleware')
    next()
})

module.exports = router

test.check('load router')

test.start('logger path:routers/index')
logger.info('logger path:routers/index')
