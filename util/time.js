const moment = require('moment')

const util = {}

util.timef = (utctime, offset = 7) => {
  return utctime ? moment.utc(utctime).utcOffset(offset).format('HH:mm DD/MM/YYYY') : ''
}

module.exports = util
