import { Kafka, logLevel, type Producer, type Consumer, type KafkaMessage } from 'kafkajs'
import { config } from './config.js'
import { logger } from './logger.js'
import { util } from './util.js'

interface SubOption {
  group?: string
  fb?: boolean // fromBeginning
  retry?: number
}

export interface SubContext {
  topic: string
  message: KafkaMessage
}

type SubHandler<T = unknown> = (value: T, ctx: SubContext) => void | Promise<void>

let client: Kafka | null = null
let producer: Producer | null = null
const consumers = new Map<string, Consumer>()

export function getKafka(): Kafka {
  if (client) return client
  if (!config.kafka_broker_uri) throw new Error('kafka: config.kafka_broker_uri is required')

  client = new Kafka({
    clientId: config.service,
    brokers: config.kafka_broker_uri.split(','),
    logLevel: logLevel.ERROR,
    retry: { initialRetryTime: 200, retries: 100 },
  })

  return client
}

export async function getProducer(): Promise<Producer> {
  if (producer) return producer
  producer = getKafka().producer()
  await producer.connect()
  logger.info(`kafka: producer connected - ${util.maskUri(config.kafka_broker_uri)}`)
  return producer
}

/** Publish a JSON message with automatic retry */
export async function pub(topic: string, message: unknown, key?: string, tries = 1): Promise<void> {
  const p = await getProducer()

  try {
    await p.send({ topic, messages: [{ key, value: JSON.stringify(message) }] })
  } catch (err) {
    if (tries > 3) {
      logger.error(`kafka: producer send error, topic=${topic}`, { error: String(err) })
      return
    }
    await util.sleep(100 * tries)
    return pub(topic, message, key, tries + 1)
  }
}

/**
 * Subscribe with a dedicated consumer per topic — handlers can be registered
 * at any time, no shared-consumer ordering constraints.
 */
export async function sub<T = unknown>(topic: string, handler: SubHandler<T>, option: SubOption = {}, tries = 1): Promise<void> {
  if (consumers.has(topic)) {
    logger.error(`kafka: consumer already exists, topic=${topic}`)
    return
  }

  const group = option.group ?? `${config.service}:${config.env}:${topic}`
  const fb = option.fb ?? true

  const consumer = getKafka().consumer({
    groupId: group,
    sessionTimeout: 900000,
    retry: {
      retries: option.retry ?? 1,
      restartOnFailure: async (error) => {
        logger.error(`kafka: all retries failed, topic=${topic}`, { error: String(error) })
        return false
      },
    },
  })

  consumers.set(topic, consumer)

  try {
    await consumer.connect()
    await consumer.subscribe({ topic, fromBeginning: fb })

    await consumer.run({
      eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
        // Long handlers must not miss the session heartbeat
        const hb = setInterval(() => heartbeat().catch(() => {}), 5000)

        try {
          for (const message of batch.messages) {
            const value = message.value ? (JSON.parse(message.value.toString()) as T) : (null as T)
            await handler(value, { topic, message })
            resolveOffset(message.offset)
            await commitOffsetsIfNecessary()
          }
        } finally {
          clearInterval(hb)
        }

        await heartbeat()
      },
    })
  } catch (err) {
    consumers.delete(topic)

    if (tries > 3) throw err

    logger.error(`kafka: consumer failed, topic=${topic}, tries=${tries}`)
    await util.sleep(100 * tries)
    return sub(topic, handler, option, tries + 1)
  }
}

export async function disconnectKafka(): Promise<void> {
  await Promise.all(
    [...consumers.values()].map(async (c) => {
      await c.stop()
      await c.disconnect()
    }),
  )
  consumers.clear()

  if (producer) {
    await producer.disconnect()
    producer = null
    logger.info('kafka: disconnected')
  }
}

export const kafka = { getKafka, getProducer, pub, sub, disconnectKafka }
export type KafkaModule = typeof kafka
