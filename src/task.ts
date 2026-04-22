import { getProducer, getConsumer } from './kafka.js'
import { config } from './config.js'
import { logger } from './logger.js'

interface TaskMeta {
  sender: string
  trips: string[]
  loop: number
  timestamp: number
}
type TaskHandler<T = unknown> = (data: T, meta: TaskMeta) => void | Promise<void>
const handlers = new Map<string, TaskHandler>()

export const task = {
  async on<T = unknown>(name: string, handler: TaskHandler<T>): Promise<void> {
    handlers.set(name, handler as TaskHandler)
    const consumer = await getConsumer()
    await consumer.subscribe({ topic: name, fromBeginning: false })
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const h = handlers.get(topic)
        if (!h || !message.value) return
        try {
          const payload = JSON.parse(message.value.toString())
          const { data, meta } = payload
          if (meta.loop > config.task_loop_max) {
            logger.warn(`task: loop limit exceeded for ${topic}`)
            return
          }
          await h(data, meta)
        } catch (err) {
          logger.error(`task: handler error for ${topic}`, { error: String(err) })
        }
      },
    })
  },
  async emit<T = unknown>(name: string, data: T): Promise<void> {
    const producer = await getProducer()
    const meta: TaskMeta = { sender: config.service, trips: [config.service], loop: 0, timestamp: Date.now() }
    await producer.send({ topic: name, messages: [{ value: JSON.stringify({ data, meta }) }] })
  },
}
export type Task = typeof task
export type { TaskMeta, TaskHandler }
