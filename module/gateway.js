const epxress = require('express')
const httpProxy = require('http-proxy')

const config = require('./config')


const X_PROXY_KEY = 'x-proxy-forward-portal'

const router = epxress.Router()
const proxy = httpProxy.createProxyServer()


proxy.on('proxyReq', (proxyReq, req, res, options) => {
    proxyReq.setHeader(X_PROXY_KEY, config.env)

    if (req.body && req.headers['content-type'] && req.headers['content-type'].startsWith('application')) {
        const bodyData = JSON.stringify(req.body)
        
        proxyReq.setHeader('Content-Type', 'application/json')
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
        proxyReq.write(bodyData)
    }
})


router.use('/:service', (req, res, next) => {
    const service = req.params.service

    // prevent circle forward
    if (req.headers[X_PROXY_KEY] === config.env) {
        return next()
    }

    // prevent owner forward
    if (service === 'portal') {
        return next()
    }

    // pass to local service
    proxy.web(req, res, { target: `http://${service}:3000/api/${service}` }, (error) => {

        if (config.env === 'loc') {
            // pass to dev portal service
            console.log(`gateway: proxy pass to develop server: ${req.originalUrl}`)
            proxy.web(req, res, { target: `http://dev.portal.dichung.vn/api/${service}` }, (error) => {
                return next(error)
            })
        } else {
            return next(error)
        }
    })
})


module.exports = router