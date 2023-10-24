module.exports = (config) => {
    config.service = 'example'
    config.redis_uri = 'redis://redis'
    config.mongo_uri = 'mongodb://mongodb/example'
    config.kafka_broker_uri = 'kafka:9092'

    config.override = 'override me'
}
