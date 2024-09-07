const express = require('express')

const Router = (...params) => {
    const router = express.Router(...params)
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'option', 'use', 'all']

    methods.forEach((m) => {
        // Move origin method to private
        router[`_${m}`] = router[m]

        // Add new custon method
        router[m] = (...params) => {
            for (let i = 0, l = params.length; i < l; i++) {
                if (typeof params[i] === 'function' && params[i].constructor.name === 'AsyncFunction') {
                    const asyncHandle = params[i]
                    params[i] = (req, res, next) => {
                        return asyncHandle(req, res, next).catch(next)
                    }
                }
            }

            router[`_${m}`](...params)
        }
    })

    return router
}

module.exports = Router
