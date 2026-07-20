const { Sequelize, DataTypes, Op } = require('sequelize')
const config = require('./config')

const store = { instance: null }

const sequelize = { Sequelize, DataTypes, Op }

// Lazily create the singleton connection. cardinal.boot() calls connect() when
// config.postgres_uri is set, so requiring this module never connects on its own
// (unlike redis.js). This keeps mongo-only services from touching Postgres.
sequelize.connect = () => {
  if (store.instance) {
    return store.instance
  }

  check(config.postgres_uri, 'Missing config.postgres_uri')

  store.instance = new Sequelize(config.postgres_uri, {
    dialect: 'postgres',
    logging: config.env === 'local' ? (msg) => console.debug(msg) : false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true }, // createdAt/updatedAt by default, like mongoose
  })

  return store.instance
}

// Models use: const { sequelize } = require('core'); sequelize.db.define(...)
Object.defineProperty(sequelize, 'db', {
  get() {
    return store.instance || sequelize.connect()
  },
})

module.exports = sequelize
