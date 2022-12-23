const mongoose = require('mongoose')
const Router = require('./Router')

const query = () => {
    const router = Router({ caseSensitive: true })

    router.post('/:model', async (req, res, next) => {
        const model = req.params.model
        const pipeline = req.body

        let result = mongoose.models[model]

        Object.keys(pipeline).forEach((k) => {
            result = Array.isArray(pipeline[k]) ? result[k](...pipeline[k]) : result[k](pipeline[k])
        })

        return res.success(await result)
    })

    return router
}

module.exports = query
