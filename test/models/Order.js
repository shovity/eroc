const { mongoose, logger } = require('eroc')

test.start('add Order model')

const schema = new mongoose.Schema(
  {
    item: String,

    user: {
      _id: String,
      username: String,
    },

    embedded: {
      type: {
        _id: String,
        username: String,
      },

      set: function (protector) {
        return protector
      },
    },

    embedded2: new mongoose.Schema({
      _id: String,
      username: String,
    }),

    array: [
      {
        _id: String,
        username: String,
      },
    ],
  },
  {
    timestamps: true,

    subscribe: {
      user: 'example.User',
      embedded: 'example.User',
      embedded2: 'example.User',
      array: 'example.User',
    },
  },
)

module.exports = mongoose.model('Order', schema)

test.check('add Order model')

test.start('logger path:models/Order')
logger.info('logger path:models/Order')
