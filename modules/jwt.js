const jsonwebtoken = require('jsonwebtoken')
const config = require('./config')

const jwt = {}

jwt.sign = (data, option = {}) => {
    return jsonwebtoken.sign(data, option.secret || config.secret, {
        expiresIn: option.expiresIn || config.jwt_expires_in || '1000y',
    })
}

jwt.verify = (token, option = {}) => {
    return new Promise((resolve, reject) => {
        jsonwebtoken.verify(token, option.secret || config.secret, (error, data) => {
            if (error) {
                reject(error)
            }

            resolve(data)
        })
    })
}

module.exports = jwt
