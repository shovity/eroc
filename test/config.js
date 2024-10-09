module.exports = (config) => {
  config.service = 'example'
  config.redis_uri = 'redis://redis'
  config.mongo_uri = 'mongodb://mongodb/example'
  config.kafka_broker_uri = 'kafka:9092'

  config.override = 'override me'

  config.logger_transporter = 'test'
  config.event_sourcing_model = '*'

  config.logger_transporter_handle = {
    test: () => {
      return (data) => {
        const [key, path] = data.message.split(':')
        if (key === 'logger path') {
          test.check(data.message, path === data.path, data)
        }
      }
    },
  }
}
