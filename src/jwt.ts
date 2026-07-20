import * as jose from 'jose'
import { config } from './config.js'

export interface JwtPayload {
  [key: string]: unknown
}

interface SignOptions {
  expiresIn?: string
  secret?: string
  algorithm?: string
}

interface VerifyOptions {
  secret?: string
  algorithms?: string[]
}

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

// Asymmetric access/refresh token pattern (RS256)
const ALG = 'RS256'
let privateKeyPromise: ReturnType<typeof jose.importPKCS8> | undefined
let publicKeyPromise: ReturnType<typeof jose.importSPKI> | undefined

function getPrivateKey(): ReturnType<typeof jose.importPKCS8> {
  if (!privateKeyPromise) {
    if (!config.jwt_private_key) throw new Error('jwt: config.jwt_private_key is required')
    privateKeyPromise = jose.importPKCS8(config.jwt_private_key, ALG)
  }
  return privateKeyPromise
}

function getPublicKey(): ReturnType<typeof jose.importSPKI> {
  if (!publicKeyPromise) {
    if (!config.jwt_public_key) throw new Error('jwt: config.jwt_public_key is required')
    publicKeyPromise = jose.importSPKI(config.jwt_public_key, ALG)
  }
  return publicKeyPromise
}

export const jwt = {
  async signAccessToken(data: JwtPayload): Promise<string> {
    const key = await getPrivateKey()
    // Local: comfortable TTL so tokens don't expire mid-session; elsewhere 15m
    const expiresIn = config.access_token_expires ?? (config.env === 'local' ? '1d' : '15m')

    return new jose.SignJWT({ ...data, type: 'access' })
      .setProtectedHeader({ alg: ALG })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(key)
  },

  async signRefreshToken(uid: string): Promise<{ token: string; jti: string }> {
    const key = await getPrivateKey()
    const jti = crypto.randomUUID()

    const token = await new jose.SignJWT({ type: 'refresh', uid: String(uid), jti })
      .setProtectedHeader({ alg: ALG })
      .setIssuedAt()
      .setExpirationTime(config.refresh_token_expires)
      .sign(key)

    return { token, jti }
  },

  async verifyAccessToken<T extends JwtPayload = JwtPayload>(token: string): Promise<T> {
    const key = await getPublicKey()
    const { payload } = await jose.jwtVerify(token, key, { algorithms: [ALG] })
    if (payload.type !== 'access') throw new Error('Invalid token type')
    return payload as T
  },

  async verifyRefreshToken(token: string): Promise<{ uid: string; jti: string } & JwtPayload> {
    const key = await getPublicKey()
    const { payload } = await jose.jwtVerify(token, key, { algorithms: [ALG] })
    if (payload.type !== 'refresh') throw new Error('Invalid token type')
    return payload as { uid: string; jti: string } & JwtPayload
  },

  async sign(payload: JwtPayload, options: SignOptions = {}): Promise<string> {
    const { expiresIn = config.jwt_expires_in, secret = config.secret, algorithm = config.jwt_algorithm } = options

    const secretKey = getSecretKey(secret)

    return new jose.SignJWT(payload)
      .setProtectedHeader({ alg: algorithm })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secretKey)
  },

  async verify<T extends JwtPayload = JwtPayload>(token: string, options: VerifyOptions = {}): Promise<T> {
    const { secret = config.secret, algorithms = [config.jwt_algorithm] } = options

    const secretKey = getSecretKey(secret)

    const { payload } = await jose.jwtVerify(token, secretKey, { algorithms })

    return payload as T
  },

  decode<T extends JwtPayload = JwtPayload>(token: string): T | null {
    try {
      return jose.decodeJwt(token) as T
    } catch {
      return null
    }
  },
}

export type Jwt = typeof jwt
