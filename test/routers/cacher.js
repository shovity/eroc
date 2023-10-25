const { Router, cacher, logger } = require('eroc')

const router = Router()

router.get('/', cacher.middle(), async (req, res, next) => {
    test.start('logger path:routers/cacher:in router')
    logger.info('logger path:routers/cacher:in router')

    return res.success(Date.now())
})

module.exports = router
