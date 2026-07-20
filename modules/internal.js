const crypto = require('node:crypto')
const config = require('./config')

// Inter-service authentication via HMAC-SHA256 signed requests. The shared
// secret never travels on the wire; instead each internal call carries a
// signature bound to the request method + path + a timestamp, so captured
// headers cannot be replayed after the skew window or against a different
// endpoint.
const internal = {}

internal.HEADER = {
  sender: 'x-internal-sender',
  timestamp: 'x-internal-timestamp',
  signature: 'x-internal-signature',
}

// Maximum accepted clock skew between caller and callee (replay window).
internal.MAX_SKEW_MS = 5 * 60 * 1000

// Canonical string that both sides must build identically before hashing.
internal._canonical = ({ method, path, timestamp, sender }) => {
  return [String(method).toUpperCase(), path, String(timestamp), sender].join('\n')
}

internal._sign = (parts) => {
  return crypto.createHmac('sha256', config.internal_hmac_secret).update(internal._canonical(parts)).digest('hex')
}

/**
 * Build outgoing headers for an internal request.
 * @param {{ method: string, path: string }} req method and absolute path (e.g. "/user/in/verify")
 * @returns {Object} headers carrying sender, timestamp and signature
 */
internal.headers = ({ method, path }) => {
  const timestamp = Date.now()
  const sender = config.service
  const signature = internal._sign({ method, path, timestamp, sender })

  return {
    [internal.HEADER.sender]: sender,
    [internal.HEADER.timestamp]: String(timestamp),
    [internal.HEADER.signature]: signature,
  }
}

/**
 * Verify an incoming internal request. Returns the sender service name on
 * success, or false when the signature is missing, expired or invalid.
 * @param {{ method: string, path: string, headers: Object }} req
 */
internal.verify = ({ method, path, headers }) => {
  // Fail-secure: never authenticate when no secret is configured.
  if (!config.internal_hmac_secret) {
    return false
  }

  const sender = headers[internal.HEADER.sender]
  const timestamp = headers[internal.HEADER.timestamp]
  const signature = headers[internal.HEADER.signature]

  if (!sender || !timestamp || !signature) {
    return false
  }

  // Reject stale (or far-future) requests to bound the replay window.
  const age = Date.now() - Number(timestamp)

  if (!Number.isFinite(age) || Math.abs(age) > internal.MAX_SKEW_MS) {
    return false
  }

  const expected = internal._sign({ method, path, timestamp, sender })
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(signature, 'hex')

  // timingSafeEqual throws on length mismatch -> check first to avoid leaking via exception
  if (a.length !== b.length) {
    return false
  }

  return crypto.timingSafeEqual(a, b) ? sender : false
}

module.exports = internal
