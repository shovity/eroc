const CronJob = require('cron').CronJob
const config = require('./config')

const schedule = {
    jobs: [],
}

schedule.add = (expr, handle, option = {}) => {
    const wrap = () => {
        try {
            if (handle.constructor.name === 'AsyncFunction') {
                handle().catch((error) => {
                    console.error('schedule: error', error)
                })
            } else {
                handle()
            }
        } catch (error) {
            console.error('schedule: error', error)
        }
    }

    const cronjob = new CronJob(expr, wrap)

    if (option.env && option.env.split(' ').indexOf(config.env) === -1) {
        return cronjob
    }

    schedule.jobs.push({
        expr,
        handle: wrap,
        cronjob,
    })

    cronjob.start()

    return cronjob
}

module.exports = schedule
