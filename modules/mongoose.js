const mongoose = require('mongoose')
const config = require('./config')
const task = require('./task')

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
                console.info('mongoose: publish error', error)
            }
        })
    }

    if (option.subscribe) {
        const group = {}

        for (const [path, topic] of Object.entries(option.subscribe)) {
            if (!group[topic]) {
                group[topic] = [path]
            } else {
                group[topic].push(path)
            }
        }

        for (const [topic, paths] of Object.entries(group)) {
            task.on(`mongoose.${topic}`, async (data) => {
                for (const path of paths) {
                    const query = {
                        [`${path}._id`]: data._id,
                    }

                    const update = {
                        $set: {},
                    }

                    for (const [key, value] of Object.entries(data)) {
                        update.$set[`${path}.${key}`] = value
                    }

                    await mongoose.models[name].updateMany(query, update)
                }
            })
        }
    }

    return mongoose.__model(name, schema, collection)
}

module.exports = mongoose
