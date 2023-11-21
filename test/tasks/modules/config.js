const { config } = require('eroc')

test.start('config default')
test.start('config application')
test.start('config application override')

test.check('config default', config.port === 3000)
test.check('config application', config.service === 'example')
test.check('config application override', config.override === 'overrided')
