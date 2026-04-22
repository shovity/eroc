import type { RequestHandler } from 'express'
export function ui(template: string, data?: Record<string, unknown>): RequestHandler {
  return (req, res) => {
    res.render(template, data)
  }
}
ui.table = (model: string, inject: (req: unknown, options: unknown) => Promise<unknown>): RequestHandler => {
  return async (req, res, next) => {
    try {
      const result = await inject(req, { query: req.query, sort: {}, project: {}, limit: 20, offset: 0 })
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
}
export type UI = typeof ui
