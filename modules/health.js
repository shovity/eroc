const config = require('./config')

// Kubernetes health probes, mounted at root by cardinal so kubelet can hit the pod
// directly (no service prefix, no auth). Liveness only proves the process is alive;
// readiness aggregates the dependencies the service actually configured.
const health = {
  // Custom readiness checks registered by services. name -> async () => ({ ok, ...detail }).
  checks: {},

  // Process start time, for uptime reporting on /healthz.
  startedAt: Date.now(),
}

/**
 * Register a custom readiness check.
 * fn must be async and return { ok: boolean, ...detail }.
 * Services use this to add their own dependencies (e.g. an external API, or Kafka
 * if that service genuinely needs the producer connected before serving traffic).
 */
health.register = (name, fn) => {
  check(typeof name === 'string' && name, 'health.register: name must be a non-empty string')
  check(typeof fn === 'function', 'health.register: fn must be a function')

  health.checks[name] = fn
}

// mongoose connection.readyState -> human label.
const MONGO_STATE = ['disconnected', 'connected', 'connecting', 'disconnecting']

/**
 * Built-in readiness checks derived from configured dependencies.
 * Kafka is intentionally excluded: it connects lazily and rebalances, which would
 * make readiness flap. A service that needs it can health.register() its own check.
 */
health.builtins = () => {
  const builtins = {}

  if (config.mongo_uri) {
    builtins.mongo = async () => {
      // mongoose is a peer dependency, always safe to require.
      const mongoose = require('mongoose')
      const state = mongoose.connection.readyState

      return { ok: state === 1, state: MONGO_STATE[state] || String(state) }
    }
  }

  if (config.redis_uri) {
    builtins.redis = async () => {
      // Require lazily: redis.js throws at require time when redis_uri is unset.
      const redis = require('./redis')

      return { ok: redis.client.isReady === true }
    }
  }

  return builtins
}

/**
 * Run every readiness check (built-in + custom) and aggregate.
 * A check that throws is reported as not-ok instead of crashing the probe.
 */
health.ready = async () => {
  const all = { ...health.builtins(), ...health.checks }
  const names = Object.keys(all)

  const results = await Promise.all(
    names.map(async (name) => {
      try {
        // Default ok:false so a check omitting `ok` is never counted as healthy.
        return [name, { ok: false, ...(await all[name]()) }]
      } catch (error) {
        return [name, { ok: false, error: error.message }]
      }
    }),
  )

  const checks = Object.fromEntries(results)
  const ready = names.every((name) => checks[name].ok)

  return { ready, checks }
}

/**
 * Express router exposing the k8s probes. Mounted at root by cardinal.setup.
 */
health.router = () => {
  const Router = require('./Router')
  const router = Router()

  // Liveness: the process is up. Never touches dependencies.
  router.get('/livez', async (req, res) => {
    return res.success({ status: 'ok' })
  })

  // Readiness: every configured dependency is reachable. 503 pulls the pod from
  // the load balancer without killing it.
  router.get('/readyz', async (req, res) => {
    const { ready, checks } = await health.ready()

    return res.success({ status: ready ? 'ready' : 'unready', checks }, { code: ready ? 200 : 503 })
  })

  // Aggregated detail for humans/monitoring.
  router.get('/healthz', async (req, res) => {
    const { ready, checks } = await health.ready()

    return res.success(
      {
        status: ready ? 'ready' : 'unready',
        service: config.service,
        env: config.env,
        uptime: Math.floor((Date.now() - health.startedAt) / 1000),
        checks,
      },
      { code: ready ? 200 : 503 },
    )
  })

  return router
}

module.exports = health
