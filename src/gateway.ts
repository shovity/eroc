import type { RequestHandler } from 'express'
import { request } from './request.js'
interface GatewayOptions {
  target: string
  pathRewrite?: Record<string, string>
}
export function gateway(options: GatewayOptions): RequestHandler {
  return async (req, res, next) => {
    try {
      let targetPath = req.originalUrl
      if (options.pathRewrite)
        for (const [from, to] of Object.entries(options.pathRewrite))
          targetPath = targetPath.replace(new RegExp(from), to)
      const url = `${options.target}${targetPath}`
      const method = req.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'
      const response = await request[method](url, req.body, { headers: req.headers as Record<string, string> })
      res.json(response)
    } catch (err) {
      next(err)
    }
  }
}
export type Gateway = typeof gateway
