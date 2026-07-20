import type { RequestHandler } from 'express'

interface GatewayOptions {
  target: string
  pathRewrite?: Record<string, string>
}

// ponytail: buffered proxy, no streaming — switch to piping if large payloads matter
export function gateway(options: GatewayOptions): RequestHandler {
  return async (req, res, next) => {
    try {
      let targetPath = req.originalUrl
      if (options.pathRewrite)
        for (const [from, to] of Object.entries(options.pathRewrite))
          targetPath = targetPath.replace(new RegExp(from), to)

      const headers = { ...req.headers } as Record<string, string>
      delete headers.host
      delete headers['content-length']

      const upstream = await fetch(`${options.target}${targetPath}`, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      })

      res.status(upstream.status)
      const contentType = upstream.headers.get('content-type')
      if (contentType) res.setHeader('Content-Type', contentType)
      res.send(Buffer.from(await upstream.arrayBuffer()))
    } catch (err) {
      next(err)
    }
  }
}
export type Gateway = typeof gateway
