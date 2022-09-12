const Router = require('./Router')


module.exports = (template, command={}) => {
    const router = Router()

    router.get('/', async (req, res, next) => {
        const handle = command.context
        
        let context = null

        if (!handle) {
            return res.render(template, { layout: false })
        }

        if (handle.constructor.name === 'AsyncFunction') {
            context = await handle(req, res, next)
        } else {
            context = handle(req, res, next)
        }

        if (!context) {
            return
        }

        return res.render(template, {
            layout: false,
            ...context,
        })
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