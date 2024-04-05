const Router = require('./Router')

const ui = (template, command = {}) => {
    const router = Router()

    if (command.middle) {
        router.use(command.middle)
    }

    router.get('/', async (req, res, next) => {
        const context = { layout: false }

        if (command.context) {
            Object.assign(context, await command.context(req, res, next))
        }

        return res.render(template, context)
    })

    router.post('/', (req, res, next) => {
        const _command = req.query._command
        let handle = command[_command]

        if (!_command) {
            return res.error('Missing command name')
        }

        if (typeof handle !== 'function') {
            return res.error(`command "${_command}" not found`)
        }

        if (typeof handle === 'function' && handle.constructor.name === 'AsyncFunction') {
            const asyncHanle = handle
            handle = (req, res, next) => {
                return asyncHanle(req, res, next).catch(next)
            }
        }

        handle(req, res, next)
    })

    return router
}

ui.table = (model, inject) => {
    return async (req, res, next) => {
        const modes = req.gp('modes', ['data', 'total'])

        const param = {}

        param.limit = req.gp('limit', 12, Number)
        param.offset = req.gp('offset', 0, Number)
        param.draw = req.gp('draw', 0)

        param.query = {}
        param.project = {}
        param.sort = { _id: -1 }

        if (inject) {
            await inject(req, param)
        }

        const response = {
            data: [],

            meta: {
                draw: param.draw,
            },
        }

        if (modes.includes('total')) {
            response.meta.total = await model.countDocuments(param.query)
        }

        if (modes.includes('data')) {
            response.data = await model
                .find(param.query)
                .sort(param.sort)
                .skip(param.offset)
                .limit(param.limit)
                .select(param.project)
                .lean()
        }

        return res.success(response.data, { meta: response.meta })
    }
}

module.exports = ui
