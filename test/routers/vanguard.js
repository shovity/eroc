const { Router } = require('eroc')

const router = Router()

router.get('/', async (req, res, next) => {
  await req.auth.or('staff partner')
  return res.success(req.u.user)
})

module.exports = router
