import { z } from 'zod'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const configSchema = z.object({
  service: z.string().default('unknown'),
  port: z.coerce.number().default(3000),
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

  task_trip_max: z.coerce.number().default(10),
  task_loop_max: z.coerce.number().default(100),

  request_base: z.string().optional(),

  websocket_emitter: z.string().optional(),

  router_prefix: z.string().optional(),
  rio_monitor: z.boolean().default(false),
  api_monitor: z.boolean().default(false),
  enable_teardown: z.boolean().default(true),

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

async function loadConfig(): Promise<Config> {
  const appDir = process.cwd()

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
    ...baseConfig,
    ...overrideConfig,
    ...envConfig,
    app_dir: appDir,
  }

  const result = configSchema.safeParse(merged)

  if (!result.success) {
    console.error('config: validation failed', result.error.issues)
    return configSchema.parse({})
  }

  return result.data
}

export const config: Config = await loadConfig()
deferred.config.resolve()
