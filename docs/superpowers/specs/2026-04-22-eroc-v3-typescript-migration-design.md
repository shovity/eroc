# eroc v3.0 TypeScript Migration Design

## Overview

Migrate eroc từ JavaScript sang TypeScript, nâng major version lên 3.0 với modern stack. Không cần backward compatibility.

## Goals

- Full TypeScript với proper types
- Pure ESM module system
- Node.js 22 LTS target
- Modern tooling (tsup, native test runner)
- Tree-shakeable với subpath exports

## Decisions

| Aspect | Decision |
|--------|----------|
| Module system | Pure ESM |
| Build tool | tsup |
| Node.js target | 22 LTS |
| API style | Flat exports, improved types |
| Package structure | Core + subpath exports + peer deps |
| Testing | Node.js native test runner |
| Globals | Removed, explicit imports |

## Project Structure

```
eroc/
├── src/
│   ├── index.ts          # Re-exports core modules
│   ├── cacher.ts
│   ├── cardinal.ts
│   ├── check.ts
│   ├── config.ts
│   ├── counter.ts
│   ├── create.ts
│   ├── event.ts
│   ├── gateway.ts
│   ├── jwt.ts
│   ├── kafka.ts
│   ├── lock.ts
│   ├── logger.ts
│   ├── mongoose.ts
│   ├── query.ts
│   ├── redis.ts
│   ├── request.ts
│   ├── rio.ts
│   ├── router.ts
│   ├── scanner.ts
│   ├── schedule.ts
│   ├── sheet.ts
│   ├── slack.ts
│   ├── socket.ts
│   ├── task.ts
│   ├── telegram.ts
│   ├── tx.ts
│   ├── ui.ts
│   ├── util.ts
│   └── vanguard.ts
├── test/
│   └── *.test.ts
├── tsup.config.ts
├── tsconfig.json
└── package.json
```

## Package.json

```json
{
  "name": "eroc",
  "version": "3.0.0",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./cacher": { "types": "./dist/cacher.d.ts", "import": "./dist/cacher.js" },
    "./cardinal": { "types": "./dist/cardinal.d.ts", "import": "./dist/cardinal.js" },
    "./check": { "types": "./dist/check.d.ts", "import": "./dist/check.js" },
    "./config": { "types": "./dist/config.d.ts", "import": "./dist/config.js" },
    "./counter": { "types": "./dist/counter.d.ts", "import": "./dist/counter.js" },
    "./event": { "types": "./dist/event.d.ts", "import": "./dist/event.js" },
    "./gateway": { "types": "./dist/gateway.d.ts", "import": "./dist/gateway.js" },
    "./jwt": { "types": "./dist/jwt.d.ts", "import": "./dist/jwt.js" },
    "./kafka": { "types": "./dist/kafka.d.ts", "import": "./dist/kafka.js" },
    "./lock": { "types": "./dist/lock.d.ts", "import": "./dist/lock.js" },
    "./logger": { "types": "./dist/logger.d.ts", "import": "./dist/logger.js" },
    "./mongoose": { "types": "./dist/mongoose.d.ts", "import": "./dist/mongoose.js" },
    "./query": { "types": "./dist/query.d.ts", "import": "./dist/query.js" },
    "./redis": { "types": "./dist/redis.d.ts", "import": "./dist/redis.js" },
    "./request": { "types": "./dist/request.d.ts", "import": "./dist/request.js" },
    "./rio": { "types": "./dist/rio.d.ts", "import": "./dist/rio.js" },
    "./router": { "types": "./dist/router.d.ts", "import": "./dist/router.js" },
    "./scanner": { "types": "./dist/scanner.d.ts", "import": "./dist/scanner.js" },
    "./schedule": { "types": "./dist/schedule.d.ts", "import": "./dist/schedule.js" },
    "./sheet": { "types": "./dist/sheet.d.ts", "import": "./dist/sheet.js" },
    "./slack": { "types": "./dist/slack.d.ts", "import": "./dist/slack.js" },
    "./socket": { "types": "./dist/socket.d.ts", "import": "./dist/socket.js" },
    "./task": { "types": "./dist/task.d.ts", "import": "./dist/task.js" },
    "./telegram": { "types": "./dist/telegram.d.ts", "import": "./dist/telegram.js" },
    "./tx": { "types": "./dist/tx.d.ts", "import": "./dist/tx.js" },
    "./ui": { "types": "./dist/ui.d.ts", "import": "./dist/ui.js" },
    "./util": { "types": "./dist/util.d.ts", "import": "./dist/util.js" },
    "./vanguard": { "types": "./dist/vanguard.d.ts", "import": "./dist/vanguard.js" }
  },
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "node --test",
    "test:coverage": "node --test --experimental-test-coverage",
    "lint": "eslint src --fix",
    "format": "prettier --write src",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^5.0.0",
    "zod": "^3.23.0",
    "jose": "^5.9.0",
    "cron": "^4.0.0"
  },
  "peerDependencies": {
    "mongoose": "^8.0.0",
    "redis": "^5.0.0",
    "kafkajs": "^2.0.0"
  },
  "peerDependenciesMeta": {
    "mongoose": { "optional": true },
    "redis": { "optional": true },
    "kafkajs": { "optional": true }
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsup": "^8.0.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0"
  }
}
```

## Module Designs

### check.ts

```ts
export interface CheckError extends Error {
  [key: string]: unknown
}

export function check(
  condition: unknown,
  message: string | Record<string, unknown>
): asserts condition

export function is<T>(value: T): value is NonNullable<T>

export function checkWith<E extends Error>(
  ErrorClass: new (message: string) => E,
  condition: unknown,
  message: string
): asserts condition
```

### config.ts

```ts
import { z } from 'zod'

const configSchema = z.object({
  service: z.string(),
  port: z.number().default(3000),
  env: z.enum(['local', 'dev', 'staging', 'prod']).default('local'),
  secret: z.string().default('terces'),
  cors_origin: z.string().default('*'),
  seek_static: z.string().default('static'),
  seek_public: z.string().default('public'),
  seek_views: z.string().default('views'),
  seek_tasks: z.string().default('tasks'),
  seek_routers: z.string().default('routers'),
  seek_events: z.string().default('events'),
  logger_transporter: z.string().default('console:debug'),
  vanguard_detector: z.string().default('token, cookie'),
  vanguard_supervisor: z.string().default(''),
  mongo_uri: z.string().optional(),
  redis_uri: z.string().optional(),
  kafka_broker_uri: z.string().optional(),
  jwt_expires_in: z.string().optional(),
  jwt_algorithm: z.string().default('HS256'),
  slack_token: z.string().optional(),
  slack_default_channel: z.string().optional(),
  telegram_token: z.string().optional(),
  sheet_credential: z.string().optional(),
  task_trip_max: z.number().default(10),
  task_loop_max: z.number().default(100),
})

export type Config = z.infer<typeof configSchema>
export const config: Config
export const deferred: {
  config: PromiseWithResolvers<void>
  setup: PromiseWithResolvers<void>
}
```

### create.ts & cardinal.ts

```ts
import type { Application } from 'express'
import type { Server } from 'node:http'

export interface ErocApp {
  app: Application
  server: Server
  shutdown: () => Promise<void>
}

export type MiddlewareSetup = (app: Application) => void | Promise<void>

export function create(middleware?: MiddlewareSetup): ErocApp
export function teardown(handler: () => Promise<void>): void
export function shutdown(): Promise<void>
```

### logger.ts

```ts
type LogLevel = 'emerg' | 'alert' | 'crit' | 'error' | 'warn' | 'notice' | 'info' | 'debug'

export const logger: {
  emerg: (msg: string, payload?: Record<string, unknown>) => void
  alert: (msg: string, payload?: Record<string, unknown>) => void
  crit: (msg: string, payload?: Record<string, unknown>) => void
  error: (msg: string, payload?: Record<string, unknown>) => void
  warn: (msg: string, payload?: Record<string, unknown>) => void
  notice: (msg: string, payload?: Record<string, unknown>) => void
  info: (msg: string, payload?: Record<string, unknown>) => void
  debug: (msg: string, payload?: Record<string, unknown>) => void
}
```

### redis.ts

```ts
export const redis: {
  get client(): RedisClientType | null
  cmd<T = unknown>(...args: unknown[]): Promise<T>
  get<T = string>(key: string): Promise<T | null>
  set(key: string, value: string, options?: { EX?: number }): Promise<void>
  del(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<boolean>
  hget(key: string, field: string): Promise<string | null>
  hset(key: string, field: string, value: string): Promise<number>
  hgetall(key: string): Promise<Record<string, string>>
  hdel(key: string, field: string): Promise<number>
  pub(channel: string, message: string | object): Promise<number>
  sub(channel: string, callback: (message: string) => void): Promise<void>
}
```

### mongoose.ts

```ts
import type { Model, Document, SchemaDefinition, SchemaOptions } from 'mongoose'

export function Schema<T extends Document>(
  definition: SchemaDefinition<T>,
  options?: SchemaOptions
): MongooseSchema<T>

export function model<T extends Document>(
  name: string,
  schema: MongooseSchema<T>,
  collection?: string
): Model<T>

export { mongoose }
```

### task.ts

```ts
interface TaskMeta {
  sender: string
  trips: string[]
  loop: number
  timestamp: number
}

type TaskHandler<T = unknown> = (data: T, meta: TaskMeta) => void | Promise<void>

export const task: {
  on<T = unknown>(name: string, handler: TaskHandler<T>): Promise<void>
  emit<T = unknown>(name: string, data: T): Promise<void>
}
```

### jwt.ts

```ts
export const jwt: {
  sign(payload: JwtPayload, options?: SignOptions): Promise<string>
  verify<T extends JwtPayload = JwtPayload>(token: string, options?: VerifyOptions): Promise<T>
  decode<T extends JwtPayload = JwtPayload>(token: string): T | null
}
```

### vanguard.ts

```ts
declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export interface AuthPayload {
  uid?: string
  sid?: string
  roles?: string[]
  [key: string]: unknown
}

export const vanguard: {
  detect(): RequestHandler
  supervise(): RequestHandler
  supervisors: Record<string, () => RequestHandler>
  detectors: Record<string, Detector>
}
```

### Other Modules (Summary)

```ts
// util.ts
export const util: {
  sleep: (ms: number) => Promise<void>
  deferred: <T>() => PromiseWithResolvers<T>
  throttle: <T extends Function>(fn: T, wait: number) => T
  debounce: <T extends Function>(fn: T, wait: number) => T
  intersect: <T extends object>(target: T, source: Partial<T>) => T
}

// request.ts (uses native fetch)
export const request: {
  get<T>(url: string, params?: object): Promise<T>
  post<T>(url: string, body?: object): Promise<T>
  put<T>(url: string, body?: object): Promise<T>
  patch<T>(url: string, body?: object): Promise<T>
  delete<T>(url: string, body?: object): Promise<T>
}

// event.ts
export const event: {
  emit: (name: string, data: unknown) => void
  on: <T>(name: string, handler: (data: T) => void) => void
  off: (name: string, handler: Function) => void
}

// schedule.ts
export const schedule: {
  add: (expr: string, handler: () => void | Promise<void>) => CronJob
  remove: (job: CronJob) => void
}

// tx.ts
export const tx: {
  get: <T>(key: string) => T | undefined
  set: (key: string, value: unknown) => void
  init: () => RequestHandler
  run: <T>(fn: () => T) => T
}

// lock.ts
export const lock: {
  acquire: (key: string, ttl: number) => Promise<boolean>
  release: (key: string) => Promise<void>
  using: <T>(key: string, fn: () => Promise<T>) => Promise<T>
}

// cacher.ts
export const cacher: {
  middle: (options?: { expire?: number; prefix?: string }) => RequestHandler
  invalidate: (pattern: string) => Promise<void>
}

// slack.ts, telegram.ts
export const slack: { send: (message: string, options?: SlackOptions) => Promise<void> }
export const telegram: { send: (chatId: string, text: string) => Promise<void> }
```

## Testing

### Structure
```
test/
├── check.test.ts
├── config.test.ts
├── jwt.test.ts
├── util.test.ts
├── logger.test.ts
├── integration/
│   ├── redis.test.ts
│   ├── mongoose.test.ts
│   ├── task.test.ts
│   └── docker-compose.yml
└── fixtures/
```

### Commands
```bash
node --test                              # Unit tests
node --test test/integration/*.test.ts   # Integration tests
node --test --experimental-test-coverage # Coverage
```

## Breaking Changes

| v2 | v3 |
|----|-----|
| `require('eroc')` | `import from 'eroc'` |
| `global.check()` | `import { check } from 'eroc/check'` |
| Node.js >=16 | Node.js >=22 |
| Express 4.x | Express 5.x |
| Custom test runner | Node.js native |

## Migration Effort

- ~30 modules to rewrite
- Estimated: 3-5 days for core implementation
- Additional 1-2 days for testing & documentation
