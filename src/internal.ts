import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from './config.js'

// Inter-service authentication via HMAC-SHA256 signed requests. The shared
// secret never travels on the wire; each internal call carries a signature
// bound to method + path + timestamp, so captured headers cannot be replayed
// after the skew window or against a different endpoint.

export const HEADER = {
  sender: 'x-internal-sender',
  timestamp: 'x-internal-timestamp',
  signature: 'x-internal-signature',
} as const

// Maximum accepted clock skew between caller and callee (replay window)
export const MAX_SKEW_MS = 5 * 60 * 1000

interface SignParts {
  method: string
  path: string
  timestamp: number | string
  sender: string
}

function canonical({ method, path, timestamp, sender }: SignParts): string {
  return [String(method).toUpperCase(), path, String(timestamp), sender].join('\n')
}

function sign(parts: SignParts): string {
  return createHmac('sha256', config.internal_hmac_secret).update(canonical(parts)).digest('hex')
}

export const internal = {
  HEADER,
  MAX_SKEW_MS,

  /** Build outgoing headers for an internal request (path e.g. "/user/in/verify") */
  headers({ method, path }: { method: string; path: string }): Record<string, string> {
    const timestamp = Date.now()
    const sender = config.service

    return {
      [HEADER.sender]: sender,
      [HEADER.timestamp]: String(timestamp),
      [HEADER.signature]: sign({ method, path, timestamp, sender }),
    }
  },

  /**
   * Verify an incoming internal request. Returns the sender service name on
   * success, or false when the signature is missing, expired or invalid.
   */
  verify({
    method,
    path,
    headers,
  }: {
    method: string
    path: string
    headers: Record<string, string | string[] | undefined>
  }): string | false {
    // Fail-secure: never authenticate when no secret is configured
    if (!config.internal_hmac_secret) return false

    const sender = headers[HEADER.sender]
    const timestamp = headers[HEADER.timestamp]
    const signature = headers[HEADER.signature]

    if (typeof sender !== 'string' || typeof timestamp !== 'string' || typeof signature !== 'string') {
      return false
    }

    // Reject stale (or far-future) requests to bound the replay window
    const age = Date.now() - Number(timestamp)
    if (!Number.isFinite(age) || Math.abs(age) > MAX_SKEW_MS) return false

    const a = Buffer.from(sign({ method, path, timestamp, sender }), 'hex')
    const b = Buffer.from(signature, 'hex')

    // timingSafeEqual throws on length mismatch -> check first
    if (a.length !== b.length) return false

    return timingSafeEqual(a, b) ? sender : false
  },
}

export type Internal = typeof internal
