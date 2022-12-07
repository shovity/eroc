const config = require('./config')
const requester = require('./requester')

check(config.websocket_client, 'Missing config.websocket_client')
check(config.websocket_emitter, 'Missing config.websocket_emitter')

const socket = {}

socket.emit = async (event, data, option = {}) => {
    const body = {
        event: event,
        client: config.websocket_client,
    }

    if (data !== undefined) {
        body.data = data
    }

    if (option.sid) {
        body.sid = option.sid
    }

    if (option.uid) {
        body.uid = option.uid
    }

    if (option.room) {
        body.room = option.room
    }

    return await requester.post(config.websocket_emitter, body)
}

module.exports = socket
