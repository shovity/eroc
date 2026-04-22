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

export const jwt = {
  async sign(payload: JwtPayload, options: SignOptions = {}): Promise<string> {
    const { expiresIn = '1000y', secret = config.secret, algorithm = config.jwt_algorithm ?? 'HS256' } = options

    const secretKey = getSecretKey(secret)

    return new jose.SignJWT(payload)
      .setProtectedHeader({ alg: algorithm })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secretKey)
  },

  async verify<T extends JwtPayload = JwtPayload>(token: string, options: VerifyOptions = {}): Promise<T> {
    const { secret = config.secret, algorithms = ['HS256'] } = options

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
