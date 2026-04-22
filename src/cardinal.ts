// src/cardinal.ts
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
import { redis } from './redis.js'
import { disconnect as disconnectMongo } from './mongoose.js'
import { disconnectKafka } from './kafka.js'

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

  await Promise.all(cardinal.teardownHandlers.map((h) => h().catch(() => {})))

  // Disconnect integrations
  await redis.disconnect().catch(() => {})
  await disconnectMongo().catch(() => {})
  await disconnectKafka().catch(() => {})

  logger.info(`cardinal: shutdown completed in ${Date.now() - start}ms`)
}

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const response = {
    message: error.message || 'Unknown error',
    service: config.service,
    env: config.env,
    txid: tx.get('txid'),
    url: req.originalUrl,
    method: req.method,
  }

  const status = error.status || (res.statusCode === 200 ? 400 : res.statusCode)
  res.status(status).json({ error: response })

  logger.error(response.message, { error: String(error), stack: error.stack })
}

export type MiddlewareSetup = (app: Application) => void | Promise<void>

export async function setup(middleware?: MiddlewareSetup): Promise<void> {
  const app = cardinal.app!

  initLogger({ service: config.service, transporter: config.logger_transporter })

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(tx.init())
  app.use(rio.cors())
  app.use(rio.base())
  app.use(rio.util())
  app.use(rio.auth())

  if (config.rio_monitor) {
    app.use(rio.monitor())
  }

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
  shutdown: typeof shutdown
} {
  const app = express()
  const server = http.createServer(app)

  cardinal.app = app
  cardinal.server = server

  setup(middleware).catch((err) => {
    logger.error('cardinal: setup failed', { error: String(err) })
  })

  return { app, server, shutdown }
}

export { cardinal }
