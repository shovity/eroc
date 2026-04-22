import { Kafka, type Producer, type Consumer } from 'kafkajs'
import { config } from './config.js'
import { logger } from './logger.js'

let kafka: Kafka | null = null
let producer: Producer | null = null
let consumer: Consumer | null = null

export async function getKafka(): Promise<Kafka> {
  if (kafka) return kafka
  if (!config.kafka_broker_uri) throw new Error('kafka: config.kafka_broker_uri is required')
  kafka = new Kafka({ clientId: config.service, brokers: config.kafka_broker_uri.split(',') })
  return kafka
}
export async function getProducer(): Promise<Producer> {
  if (producer) return producer
  const k = await getKafka()
  producer = k.producer()
  await producer.connect()
  logger.info('kafka: producer connected')
  return producer
}
export async function getConsumer(): Promise<Consumer> {
  if (consumer) return consumer
  const k = await getKafka()
  consumer = k.consumer({ groupId: config.service })
  await consumer.connect()
  logger.info('kafka: consumer connected')
  return consumer
}
export async function disconnectKafka(): Promise<void> {
  if (producer) {
    await producer.disconnect()
    logger.info('kafka: producer disconnected')
  }
  if (consumer) {
    await consumer.disconnect()
    logger.info('kafka: consumer disconnected')
  }
}
