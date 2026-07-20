import { CronJob } from 'cron'
import { config } from './config.js'
import { logger } from './logger.js'

interface ScheduleOptions {
  timezone?: string
  /** Space-separated envs the job runs in, e.g. 'prod staging' */
  env?: string
}

let index = 0

export const schedule = {
  add(expr: string, handler: () => void | Promise<void>, options: ScheduleOptions = {}): CronJob {
    const jobIndex = index++

    const wrap = async (): Promise<void> => {
      try {
        // Distributed lock: only one replica fires each tick
        if (config.schedule_lock && config.redis_uri) {
          const { redis } = await import('./redis.js')
          const acquired = await redis.cmd<string | null>('SET', `schedule:lock:${jobIndex}`, '1', 'NX', 'PX', '900')
          if (acquired !== 'OK') return
        }

        await handler()
      } catch (err) {
        logger.error('schedule: job error', { error: String(err), expr })
      }
    }

    const job = CronJob.from({
      cronTime: expr,
      onTick: wrap,
      start: false,
      timeZone: options.timezone,
    })

    // Env filter: return an unstarted job when this env is excluded
    if (options.env && !options.env.split(' ').includes(config.env)) {
      return job
    }

    job.start()
    return job
  },

  remove(job: CronJob): void {
    job.stop()
  },
}

export type Schedule = typeof schedule
