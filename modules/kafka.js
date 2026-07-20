const { Kafka, logLevel, Partitioners } = require('kafkajs')
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

  // Build SASL config from config (set by service config.js from env).
  // Internal access via docker network needs no auth; external access via IP does.
  const brokerConfig = { ...config.kafka_broker_config }

  if (config.kafka_sasl_username) {
    brokerConfig.ssl = config.kafka_ssl ?? false
    brokerConfig.sasl = {
      mechanism: config.kafka_sasl_mechanism || 'plain',
      username: config.kafka_sasl_username,
      password: config.kafka_sasl_password,
    }
  }

  kafka.client = new Kafka({
    clientId: config.service,
    brokers: config.kafka_broker_uri ? config.kafka_broker_uri.split(',') : [],
    logLevel: logLevel.ERROR,
    logCreator: logger,

    retry: {
      initialRetryTime: 200,
      retries: 100,
    },
    ...brokerConfig,
  })

  kafka.producer = kafka.client.producer({
    createPartitioner: Partitioners.DefaultPartitioner,
    ...config.kafka_producer_config,
  })

  await kafka.producer.connect()

  cardinal.teardown(async () => {
    await Promise.all(
      Object.values(kafka.consumer).map(async (c) => {
        await c.consumer.stop()
        await c.consumer.disconnect()
      }),
    )

    await kafka.producer.disconnect()
    console.info(`kafka: 🚕 Disconnected`)
  })

  kafka.ready.resolve()
  console.info(`kafka: 🚕 Connected - ${util.maskUri(config.kafka_broker_uri)}`)
}

kafka.pub = async (topic, message, key, tries = 1) => {
  await kafka.ready

  try {
    await kafka.producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(message),
        },
      ],
    })
  } catch (error) {
    if (tries > 3) {
      console.error(`kafka: producer send error, topic=${topic}`, error)
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 100 * tries))
    return await kafka.pub(topic, message, key, tries + 1)
  }
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
    sessionTimeout: 900000,
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
      eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
        const hb = setInterval(() => heartbeat(), 5000)

        try {
          for (const message of batch.messages) {
            const value = message.value ? JSON.parse(message.value.toString()) : null
            await handle(value, { topic, message })
            resolveOffset(message.offset)
            await commitOffsetsIfNecessary()
          }
        } finally {
          clearInterval(hb)
        }

        await heartbeat()
      },
    })
  } catch (error) {
    delete kafka.consumer[topic]

    if (tries > 3) {
      throw error
    }

    console.error(`kafka: consumer failed, topic=${topic}, tries=${tries}`)
    await new Promise((resolve) => setTimeout(resolve, 100 * tries))
    return await kafka.sub(topic, handle, option, tries + 1)
  }
}

boot().catch(console.error)

module.exports = kafka
