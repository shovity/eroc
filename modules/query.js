const mongoose = require('mongoose')
const Router = require('./Router')

const query = () => {
    const router = Router({ caseSensitive: true })

    router.post('/:model', async (req, res, next) => {
        let currsor = mongoose.models[req.params.model]

        if (req.body.find || req.body.findOne) {
            req.body.lean = true
        }

        for (const [method, param] of Object.entries(req.body)) {
            if (Array.isArray(param)) {
                currsor = currsor[method](...param)
            } else {
                currsor = currsor[method](param)
            }
        }

        return res.success(await currsor)
    })

    return router
}

module.exports = query
