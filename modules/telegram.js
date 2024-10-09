const config = require('./config')
const request = require('./request')

const telegram = {
  base: 'https://api.telegram.org/bot',
}

telegram.send = async (id, text) => {
  await config.deferred.config
  check(config.telegram_token, 'Missing config.telegram_token')

  return await request.post(
    `${telegram.base}${config.telegram_token}/sendMessage`,
    {
      chat_id: id,
      text,
    },
  )
}

telegram.method = async (method, param) => {
  await config.deferred.config
  check(config.telegram_token, 'Missing config.telegram_token')

  return await request.post(
    `${telegram.base}${config.telegram_token}/${method}`,
    param,
  )
}

module.exports = telegram
