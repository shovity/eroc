const CronJob = require('cron').CronJob

const config = require('./config')


const scheduler = {
    jobs: [],
}

scheduler.add = (expr, handle, option={}) => {

    const wrap = () => {
        try {
            if (handle.constructor.name === 'AsyncFunction') {
                handle().catch((error) => {
                    console.error('scheduler: error', error)
                })
            } else {
                handle()
            }
        } catch (error) {
            console.error('scheduler: error', error)
        }
    }

    const cronjob = new CronJob(expr, wrap)

    if (option.env && option.env.split(' ').indexOf(config.env) === -1) {
        return
    }

    scheduler.jobs.push({
        expr,
        handle: wrap,
        cronjob,
    })

    cronjob.start()
}


module.exports = scheduler