const jose = require('jose')
const config = require('./config')

const jwt = {}

jwt.sign = async (data, option = {}) => {
    const secret = new TextEncoder().encode(option.secret || config.secret)
      
    const token = await new jose.SignJWT(data)
        .setProtectedHeader({ alg: config.jwt_expires_alg || 'HS256' })
        .setIssuedAt()
        .setExpirationTime(option.expiresIn || config.jwt_expires_in || '1000y')
        .sign(secret)
    
    return token
}

jwt.verify = async (token, option = {}) => {
    const secret = new TextEncoder().encode(option.secret || config.secret)
    const decoded = await await jose.jwtVerify(token, secret)
    
    return decoded.payload
}

module.exports = jwt
