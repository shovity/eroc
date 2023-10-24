const { Router, cacher } = require('eroc')

const router = Router()

router.get('/', cacher.middle(), async (req, res, next) => {
    return res.success(Date.now())
})

module.exports = router
