const { Kafka, logLevel } = require('kafkajs')
const config = require('./config')
const util = require('./util')

const kafka = {
    consumer: {},
    producer: null,
    ready: util.deferred(),
}

const logger = () => {
    return ({ log }) => {
        const { message } = log

        console.log(`kafka: ${message}`)
    }
}

const boot = async () => {
    await config.deferred.config
    check(config.kafka_broker_uri, 'Missing config.kafka_broker_uri')

    kafka.client = new Kafka({
        clientId: config.service,
        brokers: config.kafka_broker_uri.split(','),
        logLevel: logLevel.ERROR,
        logCreator: logger,

        retry: {
            initialRetryTime: 200,
            retries: 100,
        },
    })

    kafka.ready.resolve()
    console.log(`kafka: 🚕 Connecting - ${config.kafka_broker_uri}`)
}

kafka.pub = async (topic, message = null) => {
    await kafka.ready

    if (!kafka.producer) {
        kafka.producer = kafka.client.producer()
        await kafka.producer.connect()
    }

    await kafka.producer.send({
        topic,
        messages: [
            {
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
kafka.sub = async (topic, handle, option) => {
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
    })

    kafka.consumer[topic] = {
        group: option.group,
        consumer,
    }

    await consumer.connect()

    await consumer.subscribe({
        topic,
        fromBeginning: option.fb,
    })

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            return handle(JSON.parse(message.value.toString()), { topic, partition, message })
        },
    })
}

boot().catch(console.error)

module.exports = kafka
