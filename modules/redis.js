const origin = require('redis')
const config = require('./config')

check(config.redis_uri, 'Missing config.redis_uri')

const redis = {}

redis.client = origin.createClient({ url: config.redis_uri })
redis.client.connect()

redis.client.on('connect', () => {
  console.info(`redis: 🍉 Connected - ${config.redis_uri}`)
})

redis.cmd = async (...arg) => {
  return redis.client.sendCommand(arg)
}

redis.expire = async (key, time) => {
  return redis.client.EXPIRE(key, time)
}

redis.get = async (key) => {
  return JSON.parse(await redis.client.GET(key))
}

redis.set = async (key, value, option) => {
  return redis.client.SET(key, JSON.stringify(value), option)
}

redis.hset = async (key, name, value) => {
  return redis.client.HSET(key, name, JSON.stringify(value))
}

redis.hget = async (key, name) => {
  return JSON.parse(await redis.client.HGET(key, name))
}

redis.hgetall = async (key) => {
  const reply = await redis.client.HGETALL(key)

  Object.keys(reply).forEach((k) => {
    reply[k] = JSON.parse(reply[k])
  })

  return reply
}

redis.hdel = async (key, name) => {
  return redis.client.HDEL(key, name)
}

redis.del = async (key) => {
  return redis.client.DEL(key)
}

redis.sub = async (channel, callback) => {
  const subscriber = redis.client.duplicate()
  await subscriber.connect()

  await subscriber.pSubscribe(channel, (message, ...arg) => {
    callback(JSON.parse(message), ...arg)
  })
}

redis.pub = async (channel, message) => {
  return redis.client.publish(channel, JSON.stringify(message))
}

module.exports = redis
