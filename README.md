# Compatible, shorter, quicker for [Express](https://github.com/expressjs/express).

[![NPM Version][npm-version-image]][npm-url]
[![NPM Install Size][npm-install-size-image]][npm-install-size-url]
[![NPM Downloads][npm-downloads-image]][npm-downloads-url]

## Installation

```console
$ yarn add eroc
```

## Usage

```js
const { create } = require('eroc')

const { app, server } = create()
```

## Features

- Cache
- Centralized configuration
- Event
- Task
- Gateway
- Logger
- Event store
- Auto load module
- Schedule
- Authentication / Authorization
- Vanguard
- Cardinal

## Configuration

### Usage

```javascript
const { config } = require('eroc')
console.log(config.env)
```

Priority: _config.js_ < _config.override.js_ < _redis_ (Centralized configuration)

### Default

```javascript
service: name(package.json)
port: 3000
env: 'local'
secret: 'terces'

// Config for CORS E.g. '' | '*' | 'origin1,origin2'
cors_origin: '*'

// Auto seek module location
seek_static: 'static'
seek_public: 'public'
seek_views: 'views'
seek_tasks: 'tasks'
seek_routers: 'routers'
seek_events: 'events'

// Apply logger transporter. E.g. console, task
logger_transporter: 'console:debug'

// Apply vanguard detector and supervisor
// Ex. vanguard_detector = token, cookie, client
// Ex. vanguard_supervisor = tiat, internal, ui, login
vanguard_detector: 'token, cookie'
vanguard_supervisor: ''

websocket_client: '_'
websocket_emitter: 'socket/in/emitter'

api_monitor: undefined
mongo_uri: undefined
redis_uri: undefined
rio_monitor: undefined
router_prefix: undefined

jwt_expires_alg: undefined
jwt_expires_in: undefined

kafka_broker_uri: undefined

request_base: undefined

sheet_credential: undefined

slack_token: undefined
slack_default_channel: undefined
slack_enable_local: undefined
slack_test_channel: undefined

telegram_token: undefined
```

## License

[MIT](LICENSE)

[npm-downloads-image]: https://badgen.net/npm/dm/eroc
[npm-downloads-url]: https://npmcharts.com/compare/eroc?minimal=true
[npm-install-size-image]: https://badgen.net/packagephobia/install/eroc
[npm-install-size-url]: https://packagephobia.com/result?p=eroc
[npm-url]: https://npmjs.org/package/eroc
[npm-version-image]: https://badgen.net/npm/v/eroc
