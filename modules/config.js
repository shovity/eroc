const path = require('node:path')

// Load .env file from current working directory
require('dotenv').config({ path: path.join(process.cwd(), '.env') })

const util = require('./util')

const config = {}

const decodePem = (value) => {
  if (!value) return ''
  if (value.includes('-----BEGIN')) return value
  return Buffer.from(value, 'base64').toString('utf8')
}

Object.assign(config, {
  app_dir: (() => {
    if (require.main?.filename) {
      return path.dirname(require.main.filename)
    }
    if (__dirname.includes('/node_modules/')) {
      return __dirname.split('/node_modules/')[0]
    }
    return process.cwd()
  })(),

  port: Number(process.env.PORT) || 3000,
  env: process.env.ENV || 'local',

  jwt_private_key: decodePem(process.env.JWT_PRIVATE_KEY),
  jwt_public_key: decodePem(process.env.JWT_PUBLIC_KEY),

  // Shared HMAC-SHA256 key for signing/verifying Kafka task messages.
  // Set -> enable sign+verify; empty -> disabled (defense-in-depth, does not block boot).
  kafka_hmac_secret: process.env.KAFKA_HMAC_SECRET || '',

  // Shared HMAC-SHA256 key for signing/verifying inter-service HTTP calls.
  // Required across services; internal /in/* routes deny everything without it.
  internal_hmac_secret: process.env.INTERNAL_HMAC_SECRET || '',

  cors_origin: process.env.CORS_ORIGIN || '',

  // Auto seek module location
  seek_static: 'static',
  seek_public: 'public',
  seek_views: 'views',
  seek_tasks: 'tasks',
  seek_routers: 'routers',
  seek_events: 'events',

  logger_transporter: process.env.LOGGER_TRANSPORTER || 'console:debug',

  vanguard_detector: process.env.VANGUARD_DETECTOR || 'token',
  vanguard_supervisor: process.env.VANGUARD_SUPERVISOR || 'internal',

  websocket_client: '_',
  websocket_emitter: 'socket/in/emitter',

  access_token_expires: process.env.ACCESS_TOKEN_EXPIRES || '15m',
  refresh_token_expires: process.env.REFRESH_TOKEN_EXPIRES || '7d',

  task_trip_max: Number(process.env.TASK_TRIP_MAX) || 20,
  task_loop_max: Number(process.env.TASK_LOOP_MAX) || 5,

  deferred: {},

  schedule_look: true,

  rio_validator: {},

  enable_teardown: process.env.NODE_ENV === 'production',
})

config.deferred.config = util.deferred()
config.deferred.setup = util.deferred()

const pkg = require(path.join(config.app_dir, 'package.json'))
config.service = pkg.name

// Load config.js
try {
  const module = require(path.join(config.app_dir, 'config'))
  const handle = module.default || module

  if (typeof handle === 'function') {
    handle(config)
  } else {
    console.error('config: config.js must be a function')
  }
} catch {
  //
}

const detectors = config.vanguard_detector.split(',').map((s) => s.trim())

if (detectors.includes('token') && !config.jwt_public_key) {
  console.error('config: 🔴 FATAL — JWT_PUBLIC_KEY là bắt buộc để verify access token (F-07)')
  process.exit(1)
}

if (config.jwt_signer && !config.jwt_private_key) {
  console.error('config: 🔴 FATAL — JWT_PRIVATE_KEY là bắt buộc cho service ký token (F-07)')
  process.exit(1)
}

const supervisors = config.vanguard_supervisor.split(',').map((s) => s.trim())

if (supervisors.includes('internal') && !config.internal_hmac_secret) {
  console.error('config: 🔴 FATAL — INTERNAL_HMAC_SECRET là bắt buộc để xác thực gọi nội bộ /in/*')
  process.exit(1)
}

const main = async () => {
  config.deferred.config.resolve()

  process.nextTick(() => {
    console.info(`confg: 🍒 Load config done - service=${config.service}, env=${config.env}`)
  })
}

main().catch((error) => {
  console.error('config: Load config error', error)
  process.exit(1)
})

module.exports = config
