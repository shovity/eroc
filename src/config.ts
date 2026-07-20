import { z } from 'zod'
import path from 'node:path'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

// Env vars arrive as strings; accept 'true'/'1' as true, anything else as false
const boolish = (def: boolean) => z.preprocess((v) => (typeof v === 'string' ? v === 'true' || v === '1' : v), z.boolean().default(def))

// PEM keys are often passed base64-encoded in env vars
const decodePem = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  if (value.includes('-----BEGIN')) return value
  return Buffer.from(value, 'base64').toString('utf8')
}

export const configSchema = z.object({
  service: z.string().default('unknown'),
  port: z.coerce.number().default(3000),
  env: z.enum(['local', 'dev', 'staging', 'prod']).default('local'),
  secret: z.string().default('terces'),

  cors_origin: z.string().default('*'),

  seek_public: z.string().default('public'),
  seek_tasks: z.string().default('tasks'),
  seek_routers: z.string().default('routers'),
  seek_events: z.string().default('events'),

  logger_transporter: z.string().default('console:debug'),

  vanguard_detector: z.string().default('token, cookie'),
  vanguard_supervisor: z.string().default(''),

  mongo_uri: z.string().optional(),
  // Emit every write of these models to task 'mongoose.event' ('*' = all, comma list)
  event_sourcing_model: z.string().optional(),
  event_sourcing_model_exclude: z.string().optional(),
  redis_uri: z.string().optional(),
  kafka_broker_uri: z.string().optional(),

  // Symmetric JWT (generic sign/verify)
  jwt_expires_in: z.string().default('30d'),
  jwt_algorithm: z.string().default('HS256'),

  // Asymmetric JWT (access/refresh token pattern, RS256).
  // Accept raw PEM or base64-encoded PEM.
  jwt_private_key: z.string().transform(decodePem).optional(),
  jwt_public_key: z.string().transform(decodePem).optional(),
  access_token_expires: z.string().optional(),
  refresh_token_expires: z.string().default('7d'),

  // HMAC-SHA256 key for signing inter-service HTTP calls (/in/* routes)
  internal_hmac_secret: z.string().default(''),
  // HMAC-SHA256 key for signing Kafka task messages; empty = disabled
  kafka_hmac_secret: z.string().default(''),
  // Override the host used for internal service calls (default: service name)
  internal_request_base: z.string().optional(),

  slack_token: z.string().optional(),
  slack_default_channel: z.string().optional(),
  telegram_token: z.string().optional(),

  task_trip_max: z.coerce.number().default(20),
  task_loop_max: z.coerce.number().default(5),

  request_base: z.string().optional(),

  websocket_emitter: z.string().optional(),

  router_prefix: z.string().optional(),
  rio_monitor: boolish(false),
  // Distributed lock so a schedule fires once across replicas (needs redis)
  schedule_lock: boolish(true),
  enable_teardown: boolish(true),

  app_dir: z.string().default(process.cwd()),
})

export type Config = z.infer<typeof configSchema>

export const deferred = {
  config: Promise.withResolvers<void>(),
  setup: Promise.withResolvers<void>(),
}

async function loadConfigFile(filepath: string): Promise<Record<string, unknown>> {
  try {
    const url = pathToFileURL(filepath).href
    const mod = await import(url)
    return mod.default ?? mod
  } catch {
    return {}
  }
}

function readServiceName(appDir: string): string | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')).name
  } catch {
    return undefined
  }
}

function failFast(config: Config): void {
  const supervisors = config.vanguard_supervisor.split(',').map((s) => s.trim())

  if (supervisors.includes('internal') && !config.internal_hmac_secret) {
    console.error('config: FATAL — internal_hmac_secret là bắt buộc để xác thực gọi nội bộ /in/*')
    process.exit(1)
  }
}

async function loadConfig(): Promise<Config> {
  const appDir = process.cwd()

  // Load .env if present (native Node 22)
  try {
    process.loadEnvFile(path.join(appDir, '.env'))
  } catch {
    // No .env file
  }

  // Load config files
  const baseConfig = await loadConfigFile(path.join(appDir, 'config.js'))
  const overrideConfig = await loadConfigFile(path.join(appDir, 'config.override.js'))

  // Merge with env vars (keys that match schema)
  const envConfig: Record<string, unknown> = {}
  for (const key of Object.keys(configSchema.shape)) {
    const envKey = key.toUpperCase()
    if (process.env[envKey] !== undefined) {
      envConfig[key] = process.env[envKey]
    }
  }

  const merged = {
    service: readServiceName(appDir),
    ...baseConfig,
    ...overrideConfig,
    ...envConfig,
    app_dir: appDir,
  }

  if (merged.service === undefined) delete merged.service

  const result = configSchema.safeParse(merged)

  if (!result.success) {
    console.error('config: validation failed', result.error.issues)
    process.exit(1)
  }

  failFast(result.data)

  return result.data
}

export const config: Config = await loadConfig()
deferred.config.resolve()
