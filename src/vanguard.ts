import type { RequestHandler, Request } from 'express'
import { jwt } from './jwt.js'
import { config } from './config.js'

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
  tiat: () => (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: { message: 'Unauthorized' } })
    }
    next()
  },

  internal: () => (req, res, next) => {
    const secret = req.headers['x-internal-secret']
    if (secret !== config.secret) {
      return res.status(403).json({ error: { message: 'Forbidden' } })
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

    return async (req, _res, next) => {
      for (const name of enabledDetectors) {
        const detector = detectors[name]
        if (!detector) continue

        const token = await detector(req)
        if (!token) continue

        try {
          req.auth = await jwt.verify<AuthPayload>(token)
          break
        } catch {
          // Invalid token, try next detector
        }
      }
      next()
    }
  },

  supervise(): RequestHandler {
    const enabledSupervisors = config.vanguard_supervisor
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const middlewares = enabledSupervisors.map((name) => supervisors[name]?.()).filter(Boolean) as RequestHandler[]

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
