const Router = require('./Router')

module.exports = (template, command = {}) => {
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
