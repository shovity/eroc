const { mongoose, logger } = require('eroc')

const schema = new mongoose.Schema(
    {
        item: String,

        user: {
            _id: String,
            username: String,
        },
    },
    {
        timestamps: true,

        subscribe: {
            user: 'example.User',
        },
    },
)

module.exports = mongoose.model('Order', schema)

test.start('logger path:models/Order')
logger.info('logger path:models/Order')
