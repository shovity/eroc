const config = require('./config')
const jwt = require('./jwt')
const tx = require('./tx')
const internal = require('./internal')
const Router = require('./Router')

const vanguard = {
  detector: {
    token: () => {
      return async (req) => {
        if (req.u.user) return

        // RFC 6750: Authorization: Bearer <token>
        const authHeader = req.headers.authorization

        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7)

          req.u.user = await jwt.verifyAccessToken(token)
          req.u.accessToken = token
        }
      }
    },
  },

  supervisor: {
    internal: () => {
      const router = Router()

      router.use('/:service([a-z-]+)/in/*', async (req, res, next) => {
        // Rebuild the signed path from route params (req.path is unreliable here).
        const path = `/${req.params.service}/in/${req.params[0]}`
        check(internal.verify({ method: req.method, path, headers: req.headers }), 'Internal api access denied')
        next()
      })

      return router
    },

    login: () => {
      return async (req, res, next) => {
        if (!req.u.user) {
          return res.status(401).error('401 Unauthorized')
        }

        next()
      }
    },
  },
}

vanguard.detect = () => {
  const detectors = []

  Object.assign(vanguard.detector, config.vanguard_detector_handle)

  for (const raw of config.vanguard_detector.split(',')) {
    const name = raw.trim()

    if (!name) {
      continue
    }

    const detector = vanguard.detector[name] ? vanguard.detector[name]() : undefined
    check(detector, `vanguard: detector not found: "${name}"`)

    detectors.push(detector)
  }

  return async (req, res, next) => {
    const handle = async () => {
      for (const detector of detectors) {
        await detector(req)
      }

      if (req.u.user) {
        tx.set('uid', req.u.user.uid)
      }
    }

    try {
      await handle()
      next()
    } catch (error) {
      req.cookies.token && res.u.cookie('token', '')

      return next({
        message: error.message || error,
        logout: true,
      })
    }
  }
}

vanguard.supervise = () => {
  const router = Router()
  const enabled = []

  for (const raw of config.vanguard_supervisor.split(',')) {
    const name = raw.trim()

    if (!name) {
      continue
    }

    const supervisor = vanguard.supervisor[name] ? vanguard.supervisor[name]() : undefined
    check(supervisor, `vanguard: supervisor not found: "${name}"`)

    router.use(supervisor)
    enabled.push(name)
  }

  console.info(`vanguard: 🛡️ Supervisor enabled: ${enabled.length ? enabled.join(', ') : '(none)'}`)

  return router
}

module.exports = vanguard
