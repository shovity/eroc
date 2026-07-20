const path = require('node:path')
const fs = require('node:fs')
const { Umzug, SequelizeStorage } = require('umzug')
const config = require('./config')
const sequelize = require('./sequelize')
const util = require('./util')

const migrate = {}

migrate.buildUmzug = (db) => {
  const Sequelize = sequelize.Sequelize
  const migrationsDir = path.join(config.app_dir, 'migrations')

  return new Umzug({
    migrations: {
      glob: ['*.js', { cwd: migrationsDir }],
      // Adapt each file to receive (queryInterface, Sequelize) like sequelize-cli,
      // so migration files match the official Sequelize docs format.
      resolve: ({ name, path: filepath }) => {
        const mod = require(filepath)

        return {
          name,
          up: async () => mod.up(db.getQueryInterface(), Sequelize),
          down: async () => mod.down(db.getQueryInterface(), Sequelize),
        }
      },
    },
    context: db.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize: db }), // tracking table "SequelizeMeta"
    logger: console,
  })
}

migrate.run = async () => {
  if (!config.postgres_uri) {
    return
  }

  if (config.postgres_auto_migrate === false) {
    console.info('migrate: ⏭️  Auto-migrate disabled (postgres_auto_migrate=false)')
    return
  }

  if (!(await util.readble(path.join(config.app_dir, 'migrations')))) {
    console.info('migrate: no migrations directory, skip')
    return
  }

  const db = sequelize.db

  const exec = async () => {
    const umzug = migrate.buildUmzug(db)
    const pending = await umzug.pending()

    if (pending.length === 0) {
      console.info('migrate: ✅ schema up to date (0 pending)')
      return
    }

    console.info(`migrate: ⏳ applying ${pending.length} migration(s)...`)
    const applied = await umzug.up()
    console.info(`migrate: 🧱 migrated -> ${applied.map((m) => m.name).join(', ')}`)
  }

  try {
    if (config.redis_uri) {
      // Distributed lock: only one instance migrates at a time. lock.using's
      // finally releases the key even if exec throws.
      const lock = require('./lock')
      await lock.using(`migrate:${config.service}`, exec)
    } else {
      // No redis -> single-instance assumption. The tracking table still
      // prevents duplicate application across sequential restarts.
      await exec()
    }
  } catch (error) {
    // process.exit OUTSIDE lock.using so its finally already released the key.
    console.error('migrate: 🔴 FATAL migration failed', error)
    process.exit(1)
  }
}

const MIGRATION_TEMPLATE = `'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    // e.g. await queryInterface.addColumn('table', 'column', { type: Sequelize.STRING })
  },

  async down(queryInterface, Sequelize) {
    // revert the up() change
  },
}
`

// Build a sortable timestamp prefix: YYYYMMDDHHmmss
const stamp = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

// CLI entry used by `pnpm run migrate <service> [command]` (scripts/migrate.sh).
// Runs from the service directory so config.app_dir resolves to it.
migrate.cli = async (argv = []) => {
  const command = argv[0] || 'up'
  const migrationsDir = path.join(config.app_dir, 'migrations')

  // `create` needs no DB connection — just scaffold a file.
  if (command === 'create') {
    const name = argv[1]
    check(name, 'Usage: pnpm run migrate <service> create <name>')

    fs.mkdirSync(migrationsDir, { recursive: true })
    const file = path.join(migrationsDir, `${stamp()}-${name}.js`)
    fs.writeFileSync(file, MIGRATION_TEMPLATE)
    console.info(`migrate: 📝 created ${path.relative(process.cwd(), file)}`)
    return
  }

  check(config.postgres_uri, 'Missing config.postgres_uri (service is not Postgres)')

  const db = sequelize.connect()
  await db.authenticate()

  try {
    const umzug = migrate.buildUmzug(db)

    if (command === 'up') {
      const applied = await umzug.up()
      console.info(
        applied.length
          ? `migrate: 🧱 migrated -> ${applied.map((m) => m.name).join(', ')}`
          : 'migrate: ✅ schema up to date (0 pending)',
      )
    } else if (command === 'down') {
      const reverted = await umzug.down() // revert the most recent migration
      console.info(
        reverted.length
          ? `migrate: ↩️  reverted -> ${reverted.map((m) => m.name).join(', ')}`
          : 'migrate: nothing to revert',
      )
    } else if (command === 'status') {
      const executed = await umzug.executed()
      const pending = await umzug.pending()
      console.info(`migrate: executed (${executed.length}):`)
      executed.forEach((m) => console.info(`  ✔ ${m.name}`))
      console.info(`migrate: pending (${pending.length}):`)
      pending.forEach((m) => console.info(`  • ${m.name}`))
    } else {
      throw new Error(`Unknown command "${command}". Use: up | down | status | create <name>`)
    }
  } finally {
    await db.close()
  }
}

module.exports = migrate
