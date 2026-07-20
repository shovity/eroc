import type { RequestHandler, Request } from 'express'
import { config } from './config.js'
import { tx } from './tx.js'
import { check } from './check.js'

type GpValidator =
  | ((value: unknown, key: string) => unknown)
  | RegExp
  | readonly unknown[]
  | string
  | Record<string, unknown>

interface SuccessOptions {
  meta?: Record<string, unknown>
  code?: number
}

declare global {
  namespace Express {
    interface Request {
      /** Get param from body/query/params with optional default and validation */
      gp: <T = unknown>(key: string, defaultValue?: unknown, validate?: GpValidator) => T
    }
    interface Response {
      success: (data?: unknown, options?: SuccessOptions) => void
      error: (message: string, status?: number) => void
    }
  }
}

// Named validators for req.gp — extensible via rio.validator
export const validator: Record<string, (value: unknown, key: string) => unknown> = {
  string: (value) => String(value),

  number: (value, key) => {
    const num = Number(value)
    check(!isNaN(num), `Invalid number: ${key}`)
    return num
  },

  date: (value, key) => {
    const date = new Date(Number(value) || (value as string))
    check(!isNaN(date.getTime()), `Invalid date: ${key}`)
    return date
  },

  comma: (value) =>
    String(value)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
}

function genNextUrl(data: unknown, req: Request): string {
  if (!Array.isArray(data)) return ''

  const limit = req.gp<number>('limit', 12, Number)
  const offset = req.gp<number>('offset', 0, Number) + limit

  if (data.length < limit) return ''

  const query = { ...req.query, offset: String(offset) } as Record<string, string>
  return `${req.originalUrl.split('?')[0]}?${new URLSearchParams(query).toString()}`
}

export const rio = {
  validator,

  cors(): RequestHandler {
    return (req, res, next) => {
      // Reflect the request origin when configured as '*' — browsers reject
      // Allow-Credentials combined with a literal '*'
      const origin =
        config.cors_origin === '*'
          ? (req.headers.origin ?? '*')
          : (config.cors_origin.split(',').find((o) => o.trim() === req.headers.origin) ?? '')

      res.header('Vary', 'Origin')
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
      req.gp = <T = unknown>(key: string, defaultValue?: unknown, validate?: GpValidator): T => {
        const value = [req.body?.[key], req.query[key], req.params[key], defaultValue].find((v) => v !== undefined)
        check(value !== undefined, `Missing param: ${key}`)

        if (value === defaultValue) return value as T

        if (validate instanceof RegExp) {
          check(validate.test(String(value)), `Invalid param ${key}, accept: ${validate.toString()}`)
          return value as T
        }

        if (Array.isArray(validate)) {
          check(validate.includes(value), `Invalid param ${key}, accept: ${validate.join(', ')}`)
          return value as T
        }

        if (typeof validate === 'function') {
          const converted = (validate as (value: unknown, key: string) => unknown)(value, key)
          if (converted !== undefined) return converted as T
        }

        if (typeof validate === 'string') {
          const handle = validator[validate]
          check(handle, `Rio validator not found: ${validate}`)
          return handle(value, key) as T
        }

        if (validate && typeof validate === 'object') {
          const options = Object.values(validate)
          if (options.length) {
            check(options.includes(value), `Invalid param ${key}, accept: ${options.join(', ')}`)
          }
          return value as T
        }

        return value as T
      }

      res.success = (data?: unknown, options: SuccessOptions = {}) => {
        const response: Record<string, unknown> = {}

        if (options.meta) response.meta = options.meta
        if (data !== undefined) response.data = data

        // Pagination: append meta.next when the route consumed a limit param
        if (req.gp('limit', null)) {
          response.meta = { ...(response.meta as Record<string, unknown>), next: genNextUrl(data, req) }
        }

        res.status(options.code ?? 200).json(response)
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
