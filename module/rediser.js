const redis = require('redis')

const config = require('./config')


check(config.redis_uri, 'Missing config.redis_uri')

const rediser = {
    client: redis.createClient({
        url: config.redis_uri,
    }),
}

const client = rediser.client

client.on('connect', () => {
    console.log(`rediser: 🍉 Connected - ${config.redis_uri}`)
})

rediser.cmd = async (...arg) => {
    return new Promise((resolve, reject) => {
        client[arg[0]](...arg.slice(1), (error, reply) => {
            if (error) {
                return reject(error)
            }

            return resolve(reply)
        })
    })
}

rediser.expire = (key, time) => {
    return new Promise((resolve, reject) => {
        client.expire(key, time, (error, reply) => {
            if (error) {
                return reject(error)
            }

            return resolve(JSON.parse(reply))
        })
    })
}

rediser.get = async (key) => {
    return new Promise((resolve, reject) => {
        client.get(key, (error, reply) => {
            if (error) {
                return reject(error)
            }

            return resolve(JSON.parse(reply))
        })
    })
}

rediser.set = async (key, value) => {
    return new Promise((resolve, reject) => {
        client.set(key, JSON.stringify(value), (error, reply) => {
            if (error) {
                return reject(error)
            }

            return resolve(reply)
        })
    })
}

rediser.hset = async (key, name, value) => {
    return new Promise((resolve, reject) => {
        client.hset(key, name, JSON.stringify(value), (error, reply) => {
            if (error) {
                return reject(error)
            }

            return resolve(reply)
        })
    })
}

rediser.hget = async (key, name) => {
    return new Promise((resolve, reject) => {
        client.hget(key, name, (error, reply) => {
            if (error) {
                return reject(error)
            }

            return resolve(JSON.parse(reply))
        })
    })
}

rediser.hgetall = async (key) => {
    return new Promise((resolve, reject) => {
        client.hgetall(key, (error, reply) => {
            if (error) {
                return reject(error)
            }

            Object.keys(reply).forEach((k) => {
                reply[k] = JSON.parse(reply[k])
            })

            return resolve(reply)
        })
    })
}

rediser.hdel = async (key, name) => {
    return new Promise((resolve, reject) => {
        client.hdel(key, name, (error, reply) => {
            if (error) {
                return reject(error)
            }

            return resolve()
        })
    })
}

rediser.del = async (key) => {
    return new Promise((resolve, reject) => {
        client.del(key, (error, reply) => {
            if (error) {
                return reject(error)
            }

            return resolve()
        })
    })
}



module.exports = rediser