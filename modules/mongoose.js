const mongoose = require('mongoose')
const config = require('./config')
const task = require('./task')

mongoose.__model = mongoose.model

mongoose.model = (name, schema, collection) => {
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

    return mongoose.__model(name, schema, collection)
}

module.exports = mongoose
