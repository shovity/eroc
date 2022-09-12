const caller = {}


caller.timeout = (timeout=200, fn, ...args) => {
    const instance  = {}

    instance.timeout = timeout
    instance.fn = fn
    instance.args = args
    instance.call_timeout = null

    instance.execute = fn => {
        if (fn) {
            instance.fn = fn
        }

        clearTimeout(instance.call_timeout)

        instance.call_timeout = setTimeout(() => {
            fn(...instance.args)
        }, instance.timeout)
    }

    return instance
}


module.exports = caller