const redis = require('redis')

const config = require('./config')


check(config.redis_uri, 'Missing config.redis_uri')


const client = redis.createClient({
    url: config.redis_uri,
})

client.connect()


const rediser = {
    client,
}

client.on('connect', () => {
    console.log(`rediser: 🍉 Connected - ${config.redis_uri}`)
})

rediser.cmd = async (...arg) => {
    return client.sendCommand(arg)
}

rediser.expire = async (key, time) => {
    return client.EXPIRE(key, time)
}

rediser.get = async (key) => {
    return JSON.parse(await client.GET(key))
}

rediser.set = async (key, value, option) => {
    return client.SET(key, JSON.stringify(value), option)
}

rediser.hset = async (key, name, value) => {
    client.HSET(key, name, JSON.stringify(value))
}

rediser.hget = async (key, name) => {
    return JSON.parse(await client.HGET(key, name))
}

rediser.hgetall = async (key) => {
    const reply = await client.HGETALL(key)

    Object.keys(reply).forEach((k) => {
        reply[k] = JSON.parse(reply[k])
    })

    return reply
}

rediser.hdel = async (key, name) => {
    return client.HDEL(key, name)
}

rediser.del = async (key) => {
    return client.DEL(key)
}

rediser.sub = async (channel, callback) => {
    const subscriber = client.duplicate()
    await subscriber.connect()

    await subscriber.pSubscribe(channel, (message, ...arg) => {
        callback(JSON.parse(message), ...arg)
    })
}

rediser.pub = async (channel, message) => {
    return client.publish(channel, JSON.stringify(message))
}


module.exports = rediser