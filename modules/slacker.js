const requester = require('./requester')
const config = require('./config')

check(config.slacker_token, 'Missing  config.slacker_token')

const slacker = {
    setting: {
        token: config.slacker_token,
    },
}

const setting = slacker.setting

slacker.send = async (message, option = {}) => {
    if (typeof message === 'object') {
        option = message
    }

    const body = option.raw || {
        channel: option.channel,
        attachments: option.attachments || [
            {
                color: option.color || '#00c0ef',
                title: option.title || '',
                text: message || '',
                footer: option.footer || 'Slack API',
            },
        ],
    }

    if (config.env !== 'pro') {
        body.channel = config.slacker_test_channel
    }

    return requester
        .post('https://slack.com/api/chat.postMessage', body, {
            header: {
                Authorization: `Bearer ${setting.token}`,
            },
        })
        .then((res) => {
            // console.log(res)
            return res
        })
        .catch((error) => {
            console.error('slacker: send message to slack error:', error)
        })
}

module.exports = slacker
