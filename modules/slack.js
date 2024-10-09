const request = require('./request')
const config = require('./config')

const slack = {}

slack.send = async (message, option = {}) => {
  await config.deferred.config

  check(config.slack_token, 'Missing  config.slack_token')

  if (typeof message === 'object') {
    option = message
  }

  const body = option.raw || {
    channel: option.channel || config.slack_default_channel,
    attachments: option.attachments || [
      {
        color: option.color || '#00c0ef',
        title: option.title || '',
        text: message || '',
        footer:
          option.footer || `Slack API | ${config.service} | ${config.env}`,
      },
    ],
  }

  if (config.env === 'local' && !config.slack_enable_local) {
    return console.info('slack: send -', message)
  }

  if (config.env !== 'prod' && config.slack_test_channel) {
    body.channel = config.slack_test_channel
  }

  return request
    .post('https://slack.com/api/chat.postMessage', body, {
      header: {
        Authorization: `Bearer ${config.slack_token}`,
      },
    })
    .catch((error) => {
      console.error('slack: Send message to slack error:', error)
    })
}

module.exports = slack
