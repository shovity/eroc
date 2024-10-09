const { mongoose } = require('eroc')

const schema = new mongoose.Schema(
  {
    username: String,
  },
  {
    timestamps: true,
    publish: true,
  },
)

module.exports = mongoose.model('User', schema)
