# eroc v3

Compatible, shorter, quicker for [Express](https://github.com/expressjs/express).

## Installation

```bash
npm install eroc
# or
yarn add eroc
```

## Requirements

- Node.js >= 22.0.0
- TypeScript >= 5.5.0 (for development)

## Usage

```ts
import { create, config, logger } from 'eroc'

const { app, server } = create()
```

## Subpath Imports

```ts
import { check } from 'eroc/check'
import { redis } from 'eroc/redis'
import { mongoose } from 'eroc/mongoose'
import { task } from 'eroc/task'
```

## Peer Dependencies (Optional)

```bash
# For MongoDB
npm install mongoose

# For Redis
npm install redis

# For Kafka
npm install kafkajs
```

## License

MIT
