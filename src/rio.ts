// src/rio.ts
import type { RequestHandler, Request, Response } from 'express'
import { config } from './config.js'
import { tx } from './tx.js'
import { logger } from './logger.js'

declare global {
  namespace Express {
    interface Response {
      success: (data?: unknown) => void
      error: (message: string, status?: number) => void
    }
    interface Request {
      u: {
        emit: (event: string, data: unknown) => void
      }
    }
  }
}

export const rio = {
  cors(): RequestHandler {
    return (req, res, next) => {
      const origin =
        config.cors_origin === '*' ? '*' : (config.cors_origin.split(',').find((o) => o === req.headers.origin) ?? '')

      res.header('Access-Control-Allow-Origin', origin)
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      res.header('Access-Control-Allow-Credentials', 'true')

      if (req.method === 'OPTIONS') {
        return res.sendStatus(204)
      }
      next()
    }
  },

  base(): RequestHandler {
    return (req, res, next) => {
      res.success = (data?: unknown) => {
        res.json({ data })
      }

      res.error = (message: string, status = 400) => {
        res.status(status).json({
          error: {
            message,
            service: config.service,
            txid: tx.get('txid'),
          },
        })
      }

      next()
    }
  },

  util(): RequestHandler {
    return (req, res, next) => {
      req.u = {
        emit: (event: string, data: unknown) => {
          logger.debug(`event: ${event}`, { data })
        },
      }
      next()
    }
  },

  auth(): RequestHandler {
    return (req, res, next) => {
      next()
    }
  },

  monitor(): RequestHandler {
    return (req, res, next) => {
      const start = Date.now()
      res.on('finish', () => {
        const duration = Date.now() - start
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`)
      })
      next()
    }
  },

  default(): RequestHandler {
    return (req, res, next) => {
      if (req.path === '/_status' || req.path === '/_health') {
        return res.json({
          service: config.service,
          env: config.env,
          status: 'ok',
          timestamp: new Date().toISOString(),
        })
      }
      next()
    }
  },
}

export type Rio = typeof rio
