const { config } = require('eroc')

test.start('default config')
test.start('application config')
test.start('application overrided config')

test.check('default config', config.port === 3000)
test.check('application config', config.service === 'example')
test.check('application overrided config', config.override === 'overrided')
