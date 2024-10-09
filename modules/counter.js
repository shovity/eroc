const mongoose = require('mongoose')

const counter = {}

const schema = new mongoose.Schema(
  {
    key: String,
    value: Number,
  },
  {
    timestamps: true,
  },
)

schema.index({ key: 1 })

counter.Counter = mongoose.model('ErocCounter', schema)

counter.get = async (key) => {
  const c = await counter.Counter.findOneAndUpdate(
    {
      key,
    },
    {
      $inc: {
        value: 1,
      },
    },
    {
      new: true,
      upsert: true,
    },
  )

  return c.value
}

counter.set = async (key, value) => {
  await counter.Counter.updateOne({ key }, { value })
}

module.exports = counter
