import type { RequestHandler, Request } from 'express'
import { jwt } from './jwt.js'
import { tx } from './tx.js'
import { config } from './config.js'
import { internal } from './internal.js'
import { check } from './check.js'

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export interface AuthPayload {
  uid?: string
  sid?: string
  roles?: string[]
  [key: string]: unknown
}

type Detector = (req: Request) => Promise<string | null>

const detectors: Record<string, Detector> = {
  async token(req) {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return null
    return header.slice(7)
  },

  async cookie(req) {
    return req.cookies?.token ?? null
  },

  async client(req) {
    return (req.headers['x-client-token'] as string) ?? null
  },
}

const supervisors: Record<string, () => RequestHandler> = {
  // Authenticate /:service/in/* routes via HMAC-signed internal requests
  internal: () => (req, res, next) => {
    const path = req.originalUrl.split('?')[0]

    if (!/^\/[a-z0-9-]+\/in\//.test(path)) return next()

    if (!internal.verify({ method: req.method, path, headers: req.headers })) {
      return res.status(403).json({ error: { message: 'Internal api access denied' } })
    }
    next()
  },

  login: () => (req, res, next) => {
    if (!req.auth?.uid) {
      return res.status(401).json({ error: { message: 'Login required' } })
    }
    next()
  },
}

export const vanguard = {
  detect(): RequestHandler {
    const enabledDetectors = config.vanguard_detector
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)

    return async (req, res, next) => {
      for (const name of enabledDetectors) {
        const detector = detectors[name]
        if (!detector) continue

        const token = await detector(req)
        if (!token) continue

        try {
          // Prefer RS256 access tokens when keys are configured, else HS256
          req.auth = config.jwt_public_key
            ? await jwt.verifyAccessToken<AuthPayload>(token)
            : await jwt.verify<AuthPayload>(token)
          break
        } catch {
          // Invalid token — clear a bad cookie so the client stops sending it
          if (req.cookies?.token === token) {
            res.clearCookie('token')
          }
        }
      }

      if (req.auth?.uid) {
        tx.set('uid', req.auth.uid)
      }

      next()
    }
  },

  supervise(): RequestHandler {
    const enabledSupervisors = config.vanguard_supervisor
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const middlewares = enabledSupervisors.map((name) => {
      const supervisor = supervisors[name]
      check(supervisor, `vanguard: supervisor not found: "${name}"`)
      return supervisor()
    })

    return (req, res, next) => {
      if (middlewares.length === 0) return next()

      let index = 0
      const run = (): void => {
        if (index >= middlewares.length) return next()
        middlewares[index++](req, res, run)
      }
      run()
    }
  },

  supervisors,
  detectors,
}

export type Vanguard = typeof vanguard
