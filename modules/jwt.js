const jose = require('jose')
const crypto = require('crypto')
const config = require('./config')

const jwt = {}
const ALG = 'RS256'

let privateKeyPromise
let publicKeyPromise

const getPrivateKey = () => {
  if (!privateKeyPromise) {
    if (!config.jwt_private_key) {
      throw new Error('jwt: JWT_PRIVATE_KEY chưa cấu hình')
    }
    privateKeyPromise = jose.importPKCS8(config.jwt_private_key, ALG)
  }
  return privateKeyPromise
}

const getPublicKey = () => {
  if (!publicKeyPromise) {
    if (!config.jwt_public_key) {
      throw new Error('jwt: JWT_PUBLIC_KEY chưa cấu hình')
    }
    publicKeyPromise = jose.importSPKI(config.jwt_public_key, ALG)
  }
  return publicKeyPromise
}

jwt.signAccessToken = async (data) => {
  const key = await getPrivateKey()
  const expiresIn = config.access_token_expires || '15m'

  const token = await new jose.SignJWT({ ...data, type: 'access' })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key)

  return token
}

jwt.signRefreshToken = async (uid) => {
  const key = await getPrivateKey()
  const expiresIn = config.refresh_token_expires || '7d'
  const jti = crypto.randomUUID()

  const token = await new jose.SignJWT({ type: 'refresh', uid: uid.toString(), jti })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key)

  return { token, jti }
}

jwt.verifyAccessToken = async (token) => {
  const key = await getPublicKey()
  const { payload } = await jose.jwtVerify(token, key, { algorithms: [ALG] })

  if (payload.type !== 'access') {
    throw new Error('Invalid token type')
  }

  return payload
}

jwt.verifyRefreshToken = async (token) => {
  const key = await getPublicKey()
  const { payload } = await jose.jwtVerify(token, key, { algorithms: [ALG] })

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type')
  }

  return payload
}

module.exports = jwt
