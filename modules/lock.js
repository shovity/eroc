const { redis, util } = require('eroc')

const RELEASE_CHANNEL = 'lock:release'
const map = new Map()
const lock = {}

lock.aquire = async (keys, ttl) => {
  if (!Array.isArray(keys)) {
    keys = [keys]
  }

  const rkey = `lock:aquire:${keys.join(':')}`
  return await redis.set(rkey, 1, { NX: true, PX: ttl })
}

lock.using = async (keys, handle) => {
  if (!Array.isArray(keys)) {
    keys = [keys]
  }

  const key = keys.join(':')

  const rkey = `lock:using:${key}`
  const free = await redis.set(rkey, 1, { NX: true, EX: 86400 })

  if (!free) {
    let defer = map.get(key)

    if (!defer) {
      defer = util.deferred()
    }

    map.set(key, defer)
    await defer
    return lock.using(keys, handle)
  }

  try {
    return await handle()
  } finally {
    await redis.del(rkey)
    await redis.pub(RELEASE_CHANNEL, key)
  }
}

redis.sub(RELEASE_CHANNEL, (key) => {
  const defer = map.get(key)

  if (defer) {
    map.delete(key)
    defer.resolve()
  }
})

module.exports = lock
