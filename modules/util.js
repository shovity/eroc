const { resolve } = require('node:path')
const fs = require('node:fs').promises

const util = {}

util.readble = async (dir) => {
    if (!dir) {
        return false
    }

    try {
        await fs.access(dir)
        return true
    } catch (error) {
        return false
    }
}

util.getFiles = async (dir) => {
    const dirents = await fs.readdir(dir, { withFileTypes: true })

    const files = await Promise.all(
        dirents.map((dirent) => {
            const res = resolve(dir, dirent.name)
            return dirent.isDirectory() ? util.getFiles(res) : res
        }),
    )

    return [].concat(...files)
}

util.intersect = (target, destination) => {
    if (!Array.isArray(target)) {
        return
    }

    return destination.find((e) => target.indexOf(e) !== -1)
}

util.deferred = () => {
    const holder = {}

    const promise = new Promise((resolve, reject) => {
        holder.resolve = resolve
        holder.reject = reject
    })

    return Object.assign(promise, holder)
}

util.sleep = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

util.throttle = (wait = 200, trailling = true) => {
    const instance = {
        lock: false,
        handle: null,
    }

    instance.execute = (handle, ...args) => {
        instance.handle = handle

        if (instance.lock) {
            return
        }

        instance.handle(...args)

        instance.lock = true
        instance.handle = null

        setTimeout(() => {
            instance.lock = false

            if (trailling && instance.handle) {
                instance.execute(instance.handle, ...args)
            }
        }, wait)
    }

    return instance
}

util.debounce = (wait = 200) => {
    const instance = {
        timeout: null,
    }

    instance.execute = (handle, ...args) => {
        clearTimeout(instance.timeout)
        instance.timeout = setTimeout(handle, wait, ...args)
    }

    return instance
}

module.exports = util
