const { AsyncLocalStorage } = require('node:async_hooks')
const uuid = require('uuid')
const tx = require('./tx')
const kafka = require('./kafka')
const config = require('./config')

const task = {
    asyncLocalStorage: new AsyncLocalStorage(),
}

task.emit = (name, data) => {
    const topic = `task.${name}`

    const meta = {
        sender: task.asyncLocalStorage.getStore()?.get('sender') || tx.get('txid') || uuid.v4(),
        bounce: task.asyncLocalStorage.getStore()?.get('bounce') || 0,
    }

    kafka.pub(topic, { data, meta })
}

task.on = (name, handle) => {
    check(handle.constructor.name === 'AsyncFunction', 'Param handle must be a AsyncFunction')

    const topic = `task.${name}`

    const option = {
        group: `${config.service}:${config.env}:${topic}`,
        fb: true,
        retry: 1,
    }

    /**
     * Disable comsumer group and from beginning in local
     * then it's like event
     */
    if (process.env.NODE_ENV === 'development') {
        option.fb = false
        option.group += Date.now()
    }

    const wrap = async ({ data, meta }, km) => {
        task.asyncLocalStorage.run(new Map(), () => {
            meta.bounce++
            check(meta.bounce <= config.task_max_bounce, 'Task break because out of bounce')

            task.asyncLocalStorage.getStore().set('sender', meta.sender)
            task.asyncLocalStorage.getStore().set('bounce', meta.bounce)

            meta.timestamp = +km.message.timestamp
            handle(data, meta)
        })
    }

    kafka.sub(topic, option, wrap)
}

module.exports = task
