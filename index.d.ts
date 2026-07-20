/**
 * ### Cache with redis
 * Require **config.redis_uri**
 */
export declare const cacher: {
  /**
   * ### Cache response body by middleware
   * key `cacher:middle:{prefix}:{url.base}:${md5(url.query)}`
   * @param option Default: {expire: 173200, prefix: ''}
   * @returns middleware
   */
  middle: (option?: { expire?: number; prefix?: string }) => (req?: any, res?: any, next?: any) => void
}

/**
 * ### Express app bootstrap and lifecycle
 * Creates the http server, wires middleware/vanguard, seeks resources and
 * manages graceful shutdown via teardown handles.
 */
export declare const cardinal: {
  app: any
  server: any
  teardownHandles: Array<() => Promise<void>>
  isShuttingDown: boolean

  /**
   * ### Register an async teardown handle, run on graceful shutdown
   * @param handle Must be an AsyncFunction
   */
  teardown: (handle: () => Promise<void>) => void

  /**
   * ### Create application instance and http server
   * @param middle Called after vanguard and before seeking resources
   */
  create: (middle?: (app: any) => void) => { app: any; server: any }

  setup: (middle?: (app: any) => void) => Promise<void>
  boot: () => Promise<void>
  seek: () => Promise<void>
  monitoring: () => Promise<void>
  shutdown: () => Promise<void>
  onError: (error: any, req?: any, res?: any, next?: any) => void
  silent: (response: any) => boolean | undefined
}

/**
 * ### Rate limit with redis (sliding window)
 * Require **config.redis_uri**
 */
export declare const ratelimit: {
  /**
   * ### Resolve client IP from X-Forwarded-For (behind Traefik)
   */
  getClientIp: (req: any) => string

  /**
   * ### Derive a namespace from the matched route, e.g. "POST:/user/login"
   */
  getRoutePrefix: (req: any) => string

  /**
   * ### Consume one request slot, throws a 429 error when the limit is exceeded
   * Call at the top of a route handler.
   * @param option Default: {max: 60, window: 60, prefix: 'default', message: 'Too many requests'}
   */
  consume: (option: {
    req: any
    key?: string
    max?: number
    window?: number
    prefix?: string
    message?: string
  }) => Promise<{ limited: boolean; remaining: number; count?: number }>
}

/**
 * ### Layered config from `config.js` and env vars
 * Services may attach arbitrary keys (mongo_uri, redis_uri, kafka_broker_uri, ...).
 */
export declare const config: {
  app_dir: string
  port: number
  env: string
  service: string

  // JWT (RS256) PEM keys, base64 or raw PEM via env
  jwt_private_key: string
  jwt_public_key: string
  access_token_expires: string
  refresh_token_expires: string

  // Shared HMAC-SHA256 secrets
  kafka_hmac_secret: string
  internal_hmac_secret: string

  cors_origin: string

  // Auto seek module locations
  seek_static: string
  seek_public: string
  seek_views: string
  seek_tasks: string
  seek_routers: string
  seek_events: string

  logger_transporter: string
  vanguard_detector: string
  vanguard_supervisor: string

  websocket_client: string
  websocket_emitter: string

  task_trip_max: number
  task_loop_max: number

  schedule_look: boolean
  rio_validator: Record<string, (value: any, key?: string) => any>
  enable_teardown: boolean

  deferred: {
    setup: Promise<void> & { resolve: () => void; reject: (error?: any) => void }
    config: Promise<void> & { resolve: () => void; reject: (error?: any) => void }
  }

  // Services may add their own keys (mongo_uri, redis_uri, kafka_broker_uri, ...)
  [key: string]: any
}

/**
 * ### Get auto increment value
 * Store in **Mongodb**
 * Require **config.mongo_uri**
 */
export declare const counter: {
  /**
   * ### Increment and return value
   * @param key Identify key
   * @returns Value after increment
   */
  get: (key: string) => Promise<number>

  /**
   * ### Set counter value
   * @param key Identify key
   * @param value Value
   */
  set: (key: string, value: number) => Promise<void>
}

/**
 * ### Create application instance and http server
 * Server will listen on **config.port** if it set
 *
 * @param middle Call after vangaurd and before seeking resources
 */
export declare const create: (middle?: (app: any) => void) => { app: any; server: any }

/**
 * ### Real-time events over redis pub/sub
 * Require **config.redis_uri**
 */
export declare const event: {
  emit: (name: string, data: any) => void
  on: (name: string, handle: (data: any) => Promise<void>) => void
}

export declare const gateway: () => any

/**
 * ### Kubernetes health probes
 * Mounted at root by cardinal (`/livez`, `/readyz`, `/healthz`).
 */
export declare const health: {
  checks: Record<string, () => Promise<{ ok: boolean; [key: string]: any }>>
  startedAt: number

  /**
   * ### Register a custom readiness check
   * @param fn Async, returns `{ ok: boolean, ...detail }`
   */
  register: (name: string, fn: () => Promise<{ ok: boolean; [key: string]: any }>) => void

  /** Built-in readiness checks derived from configured dependencies (mongo, redis). */
  builtins: () => Record<string, () => Promise<{ ok: boolean; [key: string]: any }>>

  /** Run every readiness check and aggregate. */
  ready: () => Promise<{ ready: boolean; checks: Record<string, { ok: boolean; [key: string]: any }> }>

  /** Express router exposing the k8s probes. */
  router: () => any
}

/**
 * ### Sign and verify HMAC-SHA256 headers for inter-service HTTP calls
 * Require **config.internal_hmac_secret**
 */
export declare const internal: {
  HEADER: { sender: string; timestamp: string; signature: string }
  MAX_SKEW_MS: number
  headers: (req: { method: string; path: string }) => Record<string, string>
  verify: (req: { method: string; path: string; headers: any }) => string | false
}

/**
 * ### JWT (RS256) sign/verify with jose
 * Require **config.jwt_private_key** to sign, **config.jwt_public_key** to verify.
 */
export declare const jwt: {
  signAccessToken: (data: any) => Promise<string>
  signRefreshToken: (uid: string) => Promise<{ token: string; jti: string }>
  verifyAccessToken: (token: string) => Promise<any>
  verifyRefreshToken: (token: string) => Promise<any>
}

/**
 * ### Kafka pub/sub wrapper
 * Require **config.kafka_broker_uri** or **config.kafka_broker_config**
 */
export declare const kafka: {
  client: any
  producer: any
  consumer: Record<string, { group: string; consumer: any }>
  ready: Promise<void> & { resolve: () => void; reject: (error?: any) => void }

  pub: (topic: string, message: any, key?: string, tries?: number) => Promise<void>

  /**
   * @param option { group, fb: from beginning, retry: number of retries }
   */
  sub: (
    topic: string,
    handle: (value: any, meta: { topic: string; message: any }) => Promise<void>,
    option?: { group?: string; fb?: boolean; retry?: number },
    tries?: number,
  ) => Promise<void>
}

/**
 * ### Distributed lock with redis
 * Require **config.redis_uri**
 */
export declare const lock: {
  acquire: (keys: any, ttl: number) => Promise<boolean>
  using: (keys: any, handle: () => Promise<any>) => Promise<any>
}

/**
 * ### RFC syslog leveled logger
 * Transports configured via **config.logger_transporter**.
 */
export declare const logger: {
  emerg: (message: string, payload?: any, extra?: any) => Promise<void>
  alert: (message: string, payload?: any, extra?: any) => Promise<void>
  crit: (message: string, payload?: any, extra?: any) => Promise<void>
  error: (message: string, payload?: any, extra?: any) => Promise<void>
  warn: (message: string, payload?: any, extra?: any) => Promise<void>
  notice: (message: string, payload?: any, extra?: any) => Promise<void>
  info: (message: string, payload?: any, extra?: any) => Promise<void>
  debug: (message: string, payload?: any, extra?: any) => Promise<void>
}

/**
 * ### Mongoose, augmented with event-sourcing / sync hooks
 * `model(name, schema, collection)` registers publish/subscribe hooks based on
 * schema options before delegating to the original `mongoose.model`.
 */
export declare const mongoose: {
  Schema: any
  model: (name: string, schema: any, collection?: string) => any
  connection: any
  models: Record<string, any>
  [key: string]: any
}

export declare const redis: {
  client: any
  cmd: (...arg: any) => Promise<any>
  expire: (key: string, time: number) => Promise<any>
  get: (key: string) => Promise<any>
  set: (key: string, value: any, option?: any) => Promise<any>
  hset: (key: string, name: string, value: any) => Promise<any>
  hget: (key: string, name: string) => Promise<any>
  hgetall: (key: string) => Promise<any>
  hdel: (key: string, name: string) => Promise<any>
  del: (key: string) => Promise<any>
  getdel: (key: string) => Promise<any>
  sub: (channel: string, callback: (message: any, ...arg: any) => void) => Promise<any>
  pub: (channel: string, message: any) => Promise<any>
}

/**
 * ### HTTP client for internal service-to-service calls
 * Relative urls (e.g. `user/in/verify`) are routed internally and signed via `internal`.
 */
export declare const request: {
  fetch: (arg: { url: string; method: string; body?: any; param?: any; option?: any }) => Promise<any>
  get: (url: string, param?: any, option?: any) => Promise<any>
  post: (url: string, body?: any, option?: any) => Promise<any>
  put: (url: string, body?: any, option?: any) => Promise<any>
  patch: (url: string, body?: any, option?: any) => Promise<any>
  delete: (url: string, body?: any, option?: any) => Promise<any>
}

export declare const Router: (...params: any) => any

/**
 * ### Auto-loads routers/events/tasks from conventional directories
 */
export declare const scanner: {
  router: (dir: string) => Promise<{ router: any; paths: string[] }>
  event: () => Promise<void>
  task: () => Promise<void>
}

export declare const schedule: {
  jobs: Array<{ expr: string; handle: any; cronjob: any }>
  add: (expr: string, handle: any, option?: { env?: string }) => any
}

export declare const socket: {
  emit: (
    event: string,
    data: any,
    option?: {
      sid?: string
      uid?: string
      room?: string
    },
  ) => Promise<any>
}

/**
 * ### Handle task with kafka under the hood
 * Require **config.kafka_broker**
 * Auto group comsumer by `serivce instance`
 */
export declare const task: {
  on: (
    name: string,
    handle: (
      data: any,
      meta: {
        sender: string
        trips: string[]
        loop: number
        timestamp: number
      },
    ) => Promise<void>,
  ) => Promise<void>

  /**
   * ### Add metadata and publish message to kafka
   * @param name Topic name
   * @param data Message payload
   * @param key Optional kafka partition key
   */
  emit: (name: string, data: any, key?: string) => Promise<void>
}

/**
 * ### Create a async context with hook
 * and manage metadata with `asyncLocalStorage`
 */
export declare const tx: {
  get: (key: string) => any
  set: (key: string, value: any) => any
  init: () => (req: any, res: any, next: any) => void
}

export declare const ui: {
  (template: string, command?: any): any

  table: (
    model: string,
    inject: (
      req: any,
      {
        query: any,
        sort: any,
        project: any,
        limit: number,
        offset: number,
        middleware: { end: any },
      },
    ) => Promise<any>,
  ) => any
}

export declare const util: {
  deferred: () => Promise<any> & { resolve: (value?: any) => void; reject: (error?: any) => void }
  sleep: (ms: number) => Promise<void>
  throttle: (wait?: number, trailing?: boolean) => { execute: (handle: () => void) => void }
  debounce: (wait?: number) => { execute: (handle: (...args: any) => void, ...args: any) => void }
  intersect: (target: any, destination: any) => any
  readble: (dir: string) => Promise<boolean>
  getFiles: (dir: string) => Promise<string[]>
  maskUri: (uri: string) => string
}

export declare const vanguard: {
  detect: () => (req?: any, res?: any, next?: any) => void
  supervise: () => any

  detector: {
    token: () => (req: any) => Promise<void>
    [key: string]: () => (req: any) => Promise<void>
  }

  supervisor: {
    internal: () => any
    login: () => (req: any, res: any, next: any) => void
    [key: string]: () => any
  }
}
