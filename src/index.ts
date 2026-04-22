// src/index.ts
// Core exports
export { check, is, checkWith, type CheckError } from './check.js'
export { config, configSchema, deferred, type Config } from './config.js'
export { logger, createLogger, initLogger, type Logger } from './logger.js'
export { util } from './util.js'
export { tx, type Tx } from './tx.js'
export { event, type Event } from './event.js'

// HTTP exports
export { create, shutdown, type MiddlewareSetup } from './create.js'
export { Router, type IRouter } from './router.js'
export { rio, type Rio } from './rio.js'
export { vanguard, type Vanguard, type AuthPayload } from './vanguard.js'

// Utilities
export { jwt, type Jwt, type JwtPayload } from './jwt.js'
export { request, type Request } from './request.js'
export { schedule, type Schedule } from './schedule.js'
