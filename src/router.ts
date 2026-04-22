// src/router.ts
import { Router as ExpressRouter, type RequestHandler, type IRouter } from 'express'

type AsyncHandler = (
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
) => Promise<unknown>

function wrapAsync(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function Router(): IRouter {
  const router = ExpressRouter()

  const originalGet = router.get.bind(router)
  const originalPost = router.post.bind(router)
  const originalPut = router.put.bind(router)
  const originalPatch = router.patch.bind(router)
  const originalDelete = router.delete.bind(router)

  const wrap = (method: typeof originalGet) => {
    return (path: string, ...handlers: (RequestHandler | AsyncHandler)[]) => {
      const wrappedHandlers = handlers.map((h) =>
        h.constructor.name === 'AsyncFunction' ? wrapAsync(h as AsyncHandler) : h,
      )
      return method(path, ...wrappedHandlers)
    }
  }

  router.get = wrap(originalGet) as typeof router.get
  router.post = wrap(originalPost) as typeof router.post
  router.put = wrap(originalPut) as typeof router.put
  router.patch = wrap(originalPatch) as typeof router.patch
  router.delete = wrap(originalDelete) as typeof router.delete

  return router
}

export type { IRouter }
