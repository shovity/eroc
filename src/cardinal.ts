import http from 'node:http'
import path from 'node:path'
import express, { type Application, type ErrorRequestHandler } from 'express'
import cookieParser from 'cookie-parser'
import { config, deferred } from './config.js'
import { scanner } from './scanner.js'
import { logger, initLogger } from './logger.js'
import { tx } from './tx.js'
import { rio } from './rio.js'
import { vanguard } from './vanguard.js'

interface Cardinal {
  app: Application | null
  server: http.Server | null
  teardownHandlers: Array<() => Promise<void>>
  isShuttingDown: boolean
}

const cardinal: Cardinal = {
  app: null,
  server: null,
  teardownHandlers: [],
  isShuttingDown: false,
}

export function teardown(handler: () => Promise<void>): void {
  cardinal.teardownHandlers.push(handler)
}

export async function shutdown(): Promise<void> {
  if (cardinal.isShuttingDown) return

  cardinal.isShuttingDown = true
  const start = Date.now()

  // Stop accepting connections, drain in-flight requests
  if (cardinal.server?.listening) {
    await new Promise<void>((resolve) => cardinal.server!.close(() => resolve()))
  }

  await Promise.all(cardinal.teardownHandlers.map((h) => h().catch(() => {})))

  // Disconnect integrations — dynamic imports so peer deps stay optional
  await Promise.all([
    import('./redis.js').then((m) => m.redis.disconnect()),
    import('./mongoose.js').then((m) => m.disconnect()),
    import('./kafka.js').then((m) => m.disconnectKafka()),
  ]).catch(() => {})

  logger.info(`cardinal: shutdown completed in ${Date.now() - start}ms`)
}

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const response: Record<string, unknown> = {
    message: error.message || String(error) || 'Unknown error',
    service: config.service,
    env: config.env,
    txid: tx.get('txid'),
    url: req.originalUrl,
    method: req.method,
  }

  // 'Some message code:some_code' -> { message, code } for machine-readable errors
  if (typeof response.message === 'string' && response.message.includes('code:')) {
    const [message, code] = response.message.split('code:')
    response.message = message.trim()
    response.code = code.trim()
  }

  const status = error.status || (res.statusCode === 200 ? 400 : res.statusCode)
  res.status(status).json({ error: response })

  logger.error(String(response.message), { error: String(error), stack: error.stack })
}

export type MiddlewareSetup = (app: Application) => void | Promise<void>

export async function setup(middleware?: MiddlewareSetup): Promise<void> {
  const app = cardinal.app!

  initLogger({ service: config.service, transporter: config.logger_transporter, appDir: config.app_dir })

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(tx.init())
  app.use(rio.cors())
  app.use(rio.base())

  // Log every API action in local dev
  if (config.env === 'local') {
    app.use(rio.apiLog())
  }

  if (config.rio_monitor) {
    app.use(rio.monitor())
  }

  // k8s health probes at root (livez/readyz/healthz), bypass auth
  const { health } = await import('./health.js')
  app.use(health.router())

  const prefix = config.router_prefix || config.service
  app.use(path.join('/', prefix), rio.default())

  app.use(vanguard.detect())
  app.use(vanguard.supervise())

  if (middleware) {
    await middleware(app)
  }

  // Auto-seek resources
  try {
    const { router, paths } = await scanner.router(config.seek_routers)
    app.use(path.join('/', prefix), router)
    logger.info(`cardinal: loaded ${paths.length} routers`)
  } catch {
    // No routers directory
  }

  await scanner.event()
  await scanner.task()

  // Static files
  try {
    app.use(express.static(path.join(config.app_dir, config.seek_public)))
  } catch {
    // No public directory
  }

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: { message: '404 Not found' } })
  })

  // Error handler
  app.use(errorHandler)

  // Graceful shutdown
  if (config.enable_teardown) {
    for (const signal of ['SIGTERM', 'SIGINT', 'SIGUSR2']) {
      process.on(signal, async () => {
        await shutdown()
        process.exit(0)
      })
    }

    process.on('uncaughtException', async (err) => {
      logger.error('cardinal: uncaughtException', { error: String(err), stack: err.stack })
      try {
        await shutdown()
      } finally {
        process.exit(1)
      }
    })
  }

  if (config.port) {
    cardinal.server!.listen(config.port, () => {
      logger.info(`cardinal: HTTP server ready - port=${config.port}`)
    })
  }

  deferred.setup.resolve()
}

export function create(middleware?: MiddlewareSetup): {
  app: Application
  server: http.Server
  ready: Promise<void>
  shutdown: typeof shutdown
} {
  const app = express()
  const server = http.createServer(app)

  cardinal.app = app
  cardinal.server = server

  const ready = setup(middleware).catch((err) => {
    logger.error('cardinal: setup failed', { error: String(err) })
    deferred.setup.reject(err)
    throw err
  })

  return { app, server, ready, shutdown }
}

export { cardinal }
