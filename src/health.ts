import { Router, type IRouter } from 'express'
import { config } from './config.js'

// Kubernetes health probes, mounted at root by cardinal (no service prefix,
// no auth). Liveness only proves the process is alive; readiness aggregates
// the dependencies the service actually configured.

type HealthCheck = () => Promise<{ ok: boolean; [key: string]: unknown }>

const checks: Record<string, HealthCheck> = {}
const startedAt = Date.now()

// mongoose connection.readyState -> human label
const MONGO_STATE = ['disconnected', 'connected', 'connecting', 'disconnecting']

/**
 * Built-in readiness checks derived from configured dependencies.
 * Kafka is intentionally excluded: it connects lazily and rebalances, which
 * would make readiness flap — services can health.register their own check.
 */
async function builtins(): Promise<Record<string, HealthCheck>> {
  const result: Record<string, HealthCheck> = {}

  if (config.mongo_uri) {
    result.mongo = async () => {
      const { mongoose } = await import('./mongoose.js')
      const state = mongoose.connection.readyState
      return { ok: state === 1, state: MONGO_STATE[state] ?? String(state) }
    }
  }

  if (config.redis_uri) {
    result.redis = async () => {
      const { redis } = await import('./redis.js')
      return { ok: redis.client?.isReady === true }
    }
  }

  return result
}

export const health = {
  /** Register a custom readiness check: async () => ({ ok, ...detail }) */
  register(name: string, fn: HealthCheck): void {
    checks[name] = fn
  },

  /** Run every readiness check (built-in + custom) and aggregate */
  async ready(): Promise<{ ready: boolean; checks: Record<string, { ok: boolean; [key: string]: unknown }> }> {
    const all = { ...(await builtins()), ...checks }
    const names = Object.keys(all)

    const results = await Promise.all(
      names.map(async (name): Promise<[string, { ok: boolean; [key: string]: unknown }]> => {
        try {
          // Default ok:false so a check omitting `ok` is never counted healthy
          const result = await all[name]()
          return [name, { ...result, ok: result.ok === true }]
        } catch (error) {
          return [name, { ok: false, error: String(error) }]
        }
      }),
    )

    const aggregated = Object.fromEntries(results)
    return { ready: names.every((name) => aggregated[name].ok), checks: aggregated }
  },

  /** Express router exposing the k8s probes, mounted at root by cardinal */
  router(): IRouter {
    const router = Router()

    // Liveness: the process is up. Never touches dependencies.
    router.get('/livez', (_req, res) => {
      res.json({ status: 'ok' })
    })

    // Readiness: every configured dependency is reachable. 503 pulls the pod
    // from the load balancer without killing it.
    router.get('/readyz', async (_req, res) => {
      const { ready, checks } = await health.ready()
      res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unready', checks })
    })

    // Aggregated detail for humans/monitoring
    router.get('/healthz', async (_req, res) => {
      const { ready, checks } = await health.ready()
      res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'unready',
        service: config.service,
        env: config.env,
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        checks,
      })
    })

    return router
  },
}

export type Health = typeof health
