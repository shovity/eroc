const mongoose = require('mongoose')
const config = require('./config')
const task = require('./task')

const subscribe = {
    pool: {},
}

mongoose.__model = mongoose.model

mongoose.model = (name, schema, collection) => {
    const option = schema.options

    if (config.event_sourcing_model === '*' || config.event_sourcing_model?.split(',').includes(name)) {
        schema.pre('save', async function () {
            const event = {
                service: config.service,
                model: name,
                target: this._id,
                command: this.getChanges(),
                method: 'save',
            }

            task.emit('mongoose.event', event)
        })

        schema.pre('updateOne', async function () {
            const event = {
                service: config.service,
                model: name,
                target: this.getQuery()._id,
                command: this.getUpdate(),
                method: 'updateOne',
            }

            task.emit('mongoose.event', event)
        })
    }

    if (option.publish) {
        const topic = `mongoose.${config.service}.${name}`

        schema.pre('save', async function () {
            try {
                if (this.isNew) {
                    return
                }

                const paths = this.modifiedPaths().filter((p) => !p.includes('.'))

                if (!paths.length) {
                    return
                }

                const data = {
                    _id: this._id,
                }

                for (const path of paths) {
                    data[path] = this[path]
                }

                task.emit(topic, data)
            } catch (error) {
                console.error('mongoose: publish error', error)
            }
        })
    }

    if (option.subscribe) {
        const group = {}

        for (const [path, topic] of Object.entries(option.subscribe)) {
            const topics = Array.isArray(topic) ? topic : [topic]

            for (const t of topics) {
                if (!group[t]) {
                    group[t] = [path]
                } else {
                    group[t].push(path)
                }
            }
        }

        for (const [topic, paths] of Object.entries(group)) {
            if (!subscribe.pool[topic]) {
                subscribe.pool[topic] = []

                task.on(`mongoose.${topic}`, async (data) => {
                    for (const handle of subscribe.pool[topic]) {
                        await handle(data)
                    }
                })
            }

            for (const path of paths) {
                let primary

                if (['Array', 'Embedded'].includes(schema.paths[path]?.instance)) {
                    primary = schema.paths[path].schema.paths._id
                } else {
                    primary = schema.paths[`${path}._id`]
                }

                check(primary.instance === 'String', `Missing string primary property ${name}.${path}._id`)
            }

            subscribe.pool[topic].push(async (data) => {
                for (const path of paths) {
                    const query = {
                        [`${path}._id`]: data._id,
                    }

                    const update = {
                        $set: {},
                    }

                    const option = {}

                    for (const [key, value] of Object.entries(data)) {
                        if (schema.paths[path]?.instance === 'Array') {
                            update.$set[`${path}.$[filter].${key}`] = value
                            option.arrayFilters = [{ 'filter._id': data._id }]
                        } else {
                            update.$set[`${path}.${key}`] = value
                        }
                    }

                    await mongoose.models[name].updateMany(query, update, option)
                }
            })
        }
    }

    return mongoose.__model(name, schema, collection)
}

module.exports = mongoose
