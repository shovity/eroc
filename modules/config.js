const path = require('node:path')
const util = require('./util')

const config = {}

Object.assign(config, {
  app_dir: __dirname.split('/node_modules/eroc/modules')[0],
  // app_dir: path.dirname(require.main.filename),
  port: 3000,
  env: 'local',
  secret: 'terces',

  // Config for CORS E.g. '' | '*' | 'origin1,origin2'
  cors_origin: '*',

  // Auto seek module location
  seek_static: 'static',
  seek_public: 'public',
  seek_views: 'views',
  seek_tasks: 'tasks',
  seek_routers: 'routers',
  seek_events: 'events',

  // Apply logger transporter. E.g. console, task
  logger_transporter: 'console:debug',

  // Apply vanguard detector and supervisor
  // Ex. vanguard_detector = token, cookie, client
  // Ex. vanguard_supervisor = tiat, internal, ui, login
  vanguard_detector: 'token, cookie',
  vanguard_supervisor: '',

  websocket_client: '_',
  websocket_emitter: 'socket/in/emitter',

  /**
   * Task
   */
  task_trip_max: 20,
  task_loop_max: 5,

  deferred: {},

  schedule_look: true,

  // Addition rio validators
  rio_validator: {},
})

config.deferred.config = util.deferred()
config.deferred.setup = util.deferred()

const package = require(path.join(config.app_dir, 'package.json'))
config.service = package.name

// Load config.js
try {
  const module = require(path.join(config.app_dir, 'config'))
  const handle = module.default || module

  if (typeof handle === 'function') {
    handle(config)
  } else {
    console.error('config: config.js must be a function')
  }
} catch (_) {
  //
}

// Load config.override.js
try {
  const module = require(path.join(config.app_dir, 'config.override'))
  const handle = module.default || module

  if (typeof handle === 'function') {
    handle(config)
  } else {
    console.error('config: config.override.js must be a function')
  }
} catch (_) {
  //
}

// Override reids_uri from environment
if (process.env.REDIS_URI) {
  config.redis_uri = process.env.REDIS_URI
}

const main = async () => {
  // Load centralized configuration
  if (config.redis_uri) {
    const redis = require('redis')
    check(config.service, 'Missing config.service')

    const client = redis.createClient({ url: config.redis_uri })
    await client.connect()

    const remoteConfigRaws = await client.multi().hGet('eroc:service', '*').hGet('eroc:service', config.service).exec()

    for (const raw of remoteConfigRaws) {
      Object.assign(config, Function('require', 'config', raw)(require, config))
    }

    client.quit()
  }

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
