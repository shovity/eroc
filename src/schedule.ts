import { CronJob } from 'cron'
import { logger } from './logger.js'

export const schedule = {
  add(expr: string, handler: () => void | Promise<void>, options: { timezone?: string } = {}): CronJob {
    const job = CronJob.from({
      cronTime: expr,
      onTick: async () => {
        try {
          await handler()
        } catch (err) {
          logger.error('schedule: job error', { error: err, expr })
        }
      },
      start: true,
      timeZone: options.timezone,
    })

    return job
  },

  remove(job: CronJob): void {
    job.stop()
  },
}

export type Schedule = typeof schedule
