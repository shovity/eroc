const epxress = require('express')
const httpProxy = require('http-proxy')
const config = require('./config')

module.exports = () => {
  const router = epxress.Router()
  const proxy = httpProxy.createProxyServer()
  const key = 'x-eroc-proxy-forward'

  proxy.on('proxyReq', (proxyReq, req) => {
    proxyReq.setHeader(key, config.env)

    if (req.body && req.headers['content-type'] && req.headers['content-type'].startsWith('application')) {
      const bodyData = JSON.stringify(req.body)

      proxyReq.setHeader('Content-Type', 'application/json')
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
      proxyReq.write(bodyData)
    }
  })

  router.use('/:service', (req, res, next) => {
    const service = req.params.service

    // Prevent owner forward
    if (service === config.service) {
      return next()
    }

    // Prevent circle forward
    if (req.headers[key] === config.env) {
      return next()
    }

    // Check gateway whitelist service
    if (config.gateway_whitelist && !config.gateway_whitelist.split(',').includes(service)) {
      return next()
    }

    // Proxy pass to local service
    proxy.web(req, res, { target: `http://${service}:3000/${service}` }, (error) => {
      if (config.gateway_fallback) {
        // Pass to developer center service
        console.info(`gateway: fall back gateway ${config.gateway_fallback} - ${req.originalUrl}`)
        proxy.web(req, res, { target: `${config.gateway_fallback}/${service}` }, (error) => {
          return next(error)
        })
      } else {
        return next(error)
      }
    })
  })

  return router
}
