const { Kafka, logLevel, Partitioners, CompressionTypes } = require('kafkajs')
const config = require('./config')
const util = require('./util')
const cardinal = require('./cardinal')

const kafka = {
  consumer: {},
  producer: null,
  ready: util.deferred(),
}

const logger = () => {
  return ({ log }) => {
    const { message } = log

    console.info(`kafka: ${message}`)
  }
}

const boot = async () => {
  await config.deferred.config

  check(
    config.kafka_broker_uri || config.kafka_broker_config,
    'Missing config.kafka_broker_uri and config.kafka_broker_config',
  )

  kafka.client = new Kafka({
    clientId: config.service,
    brokers: config.kafka_broker_uri.split(','),
    logLevel: logLevel.ERROR,
    logCreator: logger,

    retry: {
      initialRetryTime: 200,
      retries: 100,
    },
    ...config.kafka_broker_config,
  })

  kafka.producer = kafka.client.producer({
    createPartitioner: Partitioners.DefaultPartitioner,
    ...config.kafka_producer_config,
  })

  await kafka.producer.connect()

  cardinal.teardown(async () => {
    await Promise.all(Object.values(kafka.consumer).map((c) => c.consumer.disconnect()))
    await kafka.producer.disconnect()
    console.info(`kafka: 🚕 Disconnected`)
  })

  kafka.ready.resolve()
  console.info(`kafka: 🚕 Connected - ${config.kafka_broker_uri}`)
}

kafka.pub = async (topic, message, key) => {
  await kafka.ready

  await kafka.producer.send({
    topic,
    compression: CompressionTypes.GZIP,
    messages: [
      {
        key: JSON.stringify(key),
        value: JSON.stringify(message),
      },
    ],
  })
}

/**
 *
 * @param {string} topic
 * @param {object} [option] { group, fb: from beginning, retry: number of retries }
 * @param {function} handle
 */
kafka.sub = async (topic, handle, option, tries = 1) => {
  await kafka.ready

  if (typeof option === 'function') {
    const tmp = handle
    handle = option
    option = tmp
  }

  if (kafka.consumer[topic]) {
    return console.error(`kafka: consumer already exists, topic=${topic}`)
  }

  option = Object.assign(
    {
      group: `${config.service}:${config.env}:${topic}`,
      fb: true,
      retry: 1,
    },
    option,
  )

  const consumer = kafka.client.consumer({
    groupId: option.group,
    sessionTimeout: 300000,
    retry: {
      retries: option.retry,

      restartOnFailure: async (error) => {
        console.error(`kafka: all retries failed, topic=${topic}`, error)
        return false
      },
    },
    ...config.kafka_consumer_config,
  })

  kafka.consumer[topic] = {
    group: option.group,
    consumer,
  }

  try {
    await consumer.connect()

    await consumer.subscribe({
      topic,
      fromBeginning: option.fb,
    })

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        return handle(JSON.parse(message.value.toString()), {
          topic,
          partition,
          message,
        })
      },
    })
  } catch (error) {
    delete kafka.consumer[topic]

    if (tries > 5) {
      throw error
    }

    console.error(`kafka: consumer failed, topic=${topic}, tries=${tries}`)
    await new Promise((resolve) => setTimeout(resolve, 100 * tries))
    return await kafka.sub(topic, handle, option, tries + 1)
  }
}

boot().catch(console.error)

module.exports = kafka
