const { Kafka, logLevel } = require('kafkajs')
const config = require('./config')

const kafka = {
    consumer: {},

    setting: {
        broker_uri: config.kafka_broker_uri || '',
    },
}

const setting = kafka.setting

const logger = () => {
    return ({ log }) => {
        const { message } = log

        console.log(`kafka: ${message}`)
    }
}

kafka.client = new Kafka({
    clientId: config.service,
    brokers: setting.broker_uri.split(','),
    logLevel: logLevel.WARN,
    logCreator: logger,

    retry: {
        initialRetryTime: 200,
        retries: 100,
    },
})

console.log(`kafka: 🚕 Connecting - ${setting.broker_uri}`)

kafka.pub = async (topic, message = null) => {
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

module.exports = kafka
