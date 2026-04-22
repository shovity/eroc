# eroc v3.0 TypeScript Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate eroc from JavaScript to TypeScript v3.0 with Pure ESM, Node.js 22, tsup build.

**Architecture:** Flat module structure in `src/`, each module exports via subpath (`eroc/module`). Core modules always included, integrations use optional peer deps. TDD with Node.js native test runner.

**Tech Stack:** TypeScript 5.5+, tsup, Node.js 22 LTS, Express 5, Zod, jose, native test runner

---

## Phase 1: Project Setup

### Task 1: Initialize TypeScript Project

**Files:**
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Modify: `package.json`
- Delete: `index.js`, `index.d.ts`, `modules/` (after migration complete)

- [ ] **Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 2: Create tsup.config.ts**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/*.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node22',
  splitting: false,
  sourcemap: true,
})
```

- [ ] **Step 3: Update package.json**

```json
{
  "name": "eroc",
  "version": "3.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./check": {
      "types": "./dist/check.d.ts",
      "import": "./dist/check.js"
    },
    "./util": {
      "types": "./dist/util.d.ts",
      "import": "./dist/util.js"
    },
    "./config": {
      "types": "./dist/config.d.ts",
      "import": "./dist/config.js"
    },
    "./logger": {
      "types": "./dist/logger.d.ts",
      "import": "./dist/logger.js"
    },
    "./tx": {
      "types": "./dist/tx.d.ts",
      "import": "./dist/tx.js"
    },
    "./event": {
      "types": "./dist/event.d.ts",
      "import": "./dist/event.js"
    },
    "./jwt": {
      "types": "./dist/jwt.d.ts",
      "import": "./dist/jwt.js"
    },
    "./redis": {
      "types": "./dist/redis.d.ts",
      "import": "./dist/redis.js"
    },
    "./mongoose": {
      "types": "./dist/mongoose.d.ts",
      "import": "./dist/mongoose.js"
    },
    "./counter": {
      "types": "./dist/counter.d.ts",
      "import": "./dist/counter.js"
    },
    "./lock": {
      "types": "./dist/lock.d.ts",
      "import": "./dist/lock.js"
    },
    "./cacher": {
      "types": "./dist/cacher.d.ts",
      "import": "./dist/cacher.js"
    },
    "./kafka": {
      "types": "./dist/kafka.d.ts",
      "import": "./dist/kafka.js"
    },
    "./task": {
      "types": "./dist/task.d.ts",
      "import": "./dist/task.js"
    },
    "./request": {
      "types": "./dist/request.d.ts",
      "import": "./dist/request.js"
    },
    "./schedule": {
      "types": "./dist/schedule.d.ts",
      "import": "./dist/schedule.js"
    },
    "./slack": {
      "types": "./dist/slack.d.ts",
      "import": "./dist/slack.js"
    },
    "./telegram": {
      "types": "./dist/telegram.d.ts",
      "import": "./dist/telegram.js"
    },
    "./socket": {
      "types": "./dist/socket.d.ts",
      "import": "./dist/socket.js"
    },
    "./vanguard": {
      "types": "./dist/vanguard.d.ts",
      "import": "./dist/vanguard.js"
    },
    "./rio": {
      "types": "./dist/rio.d.ts",
      "import": "./dist/rio.js"
    },
    "./router": {
      "types": "./dist/router.d.ts",
      "import": "./dist/router.js"
    },
    "./scanner": {
      "types": "./dist/scanner.d.ts",
      "import": "./dist/scanner.js"
    },
    "./cardinal": {
      "types": "./dist/cardinal.d.ts",
      "import": "./dist/cardinal.js"
    },
    "./create": {
      "types": "./dist/create.d.ts",
      "import": "./dist/create.js"
    },
    "./gateway": {
      "types": "./dist/gateway.d.ts",
      "import": "./dist/gateway.js"
    },
    "./query": {
      "types": "./dist/query.d.ts",
      "import": "./dist/query.js"
    },
    "./sheet": {
      "types": "./dist/sheet.d.ts",
      "import": "./dist/sheet.js"
    },
    "./ui": {
      "types": "./dist/ui.d.ts",
      "import": "./dist/ui.js"
    }
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "node --import tsx --test 'test/**/*.test.ts'",
    "test:coverage": "node --import tsx --test --experimental-test-coverage 'test/**/*.test.ts'",
    "lint": "eslint src --fix",
    "format": "prettier --write src",
    "typecheck": "tsc",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "cookie-parser": "^1.4.7",
    "cron": "^4.0.0",
    "express": "^5.0.1",
    "zod": "^3.24.0",
    "jose": "^6.0.0"
  },
  "peerDependencies": {
    "mongoose": "^8.0.0",
    "redis": "^5.0.0",
    "kafkajs": "^2.0.0"
  },
  "peerDependenciesMeta": {
    "mongoose": { "optional": true },
    "redis": { "optional": true },
    "kafkajs": { "optional": true }
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.8",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0",
    "tsup": "^8.4.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 4: Install dependencies**

Run: `yarn install`
Expected: Dependencies installed successfully

- [ ] **Step 5: Create src directory**

Run: `mkdir -p src test`
Expected: Directories created

- [ ] **Step 6: Verify build setup**

Run: `echo "export const test = 1" > src/index.ts && yarn build`
Expected: Build succeeds, `dist/` created with `.js` and `.d.ts` files

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json tsup.config.ts package.json yarn.lock src/
git commit -m "chore: setup TypeScript project with tsup build"
```

---

## Phase 2: Core Modules

### Task 2: check.ts - Assertion Helper

**Files:**
- Create: `src/check.ts`
- Create: `test/check.test.ts`

- [ ] **Step 1: Write failing test for check()**

```ts
// test/check.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('check', () => {
  it('should not throw on truthy condition', async () => {
    const { check } = await import('../src/check.js')
    assert.doesNotThrow(() => check(true, 'error'))
    assert.doesNotThrow(() => check(1, 'error'))
    assert.doesNotThrow(() => check({}, 'error'))
    assert.doesNotThrow(() => check('str', 'error'))
  })

  it('should throw on falsy condition with string message', async () => {
    const { check } = await import('../src/check.js')
    assert.throws(() => check(false, 'error message'), { message: 'error message' })
    assert.throws(() => check(null, 'null error'))
    assert.throws(() => check(undefined, 'undefined error'))
    assert.throws(() => check(0, 'zero error'))
    assert.throws(() => check('', 'empty string error'))
  })

  it('should throw with object properties', async () => {
    const { check } = await import('../src/check.js')
    try {
      check(false, { message: 'custom', code: 'ERR_001', status: 400 })
      assert.fail('should have thrown')
    } catch (err) {
      const error = err as Error & { code: string; status: number }
      assert.strictEqual(error.message, 'custom')
      assert.strictEqual(error.code, 'ERR_001')
      assert.strictEqual(error.status, 400)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - Cannot find module '../src/check.js'

- [ ] **Step 3: Implement check()**

```ts
// src/check.ts
export interface CheckError extends Error {
  [key: string]: unknown
}

export function check(
  condition: unknown,
  message: string | Record<string, unknown>
): asserts condition {
  if (condition) return

  const error = new Error() as CheckError

  if (typeof message === 'string') {
    error.message = message
  } else {
    Object.assign(error, message)
    error.message = (message.message as string) ?? 'Assertion failed'
  }

  Error.captureStackTrace(error, check)
  throw error
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Write test for is()**

```ts
// Append to test/check.test.ts
describe('is', () => {
  it('should return true for non-nullish values', async () => {
    const { is } = await import('../src/check.js')
    assert.strictEqual(is(1), true)
    assert.strictEqual(is(''), true)
    assert.strictEqual(is(0), true)
    assert.strictEqual(is(false), true)
    assert.strictEqual(is({}), true)
    assert.strictEqual(is([]), true)
  })

  it('should return false for nullish values', async () => {
    const { is } = await import('../src/check.js')
    assert.strictEqual(is(null), false)
    assert.strictEqual(is(undefined), false)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - is is not exported

- [ ] **Step 7: Implement is()**

```ts
// Append to src/check.ts
export function is<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 9: Write test for checkWith()**

```ts
// Append to test/check.test.ts
describe('checkWith', () => {
  it('should throw custom error class', async () => {
    const { checkWith } = await import('../src/check.js')
    
    class CustomError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'CustomError'
      }
    }
    
    assert.throws(
      () => checkWith(CustomError, false, 'custom error'),
      (err: Error) => err instanceof CustomError && err.message === 'custom error'
    )
  })

  it('should not throw on truthy condition', async () => {
    const { checkWith } = await import('../src/check.js')
    class CustomError extends Error {}
    assert.doesNotThrow(() => checkWith(CustomError, true, 'error'))
  })
})
```

- [ ] **Step 10: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - checkWith is not exported

- [ ] **Step 11: Implement checkWith()**

```ts
// Append to src/check.ts
export function checkWith<E extends Error>(
  ErrorClass: new (message: string) => E,
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message)
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `yarn test`
Expected: PASS - All check tests pass

- [ ] **Step 13: Commit**

```bash
git add src/check.ts test/check.test.ts
git commit -m "feat: add check module with assertion helpers"
```

---

### Task 3: util.ts - Utility Functions

**Files:**
- Create: `src/util.ts`
- Create: `test/util.test.ts`

- [ ] **Step 1: Write failing test for sleep()**

```ts
// test/util.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('util.sleep', () => {
  it('should wait for specified milliseconds', async () => {
    const { util } = await import('../src/util.js')
    const start = Date.now()
    await util.sleep(50)
    const elapsed = Date.now() - start
    assert.ok(elapsed >= 45, `Expected at least 45ms, got ${elapsed}ms`)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - Cannot find module

- [ ] **Step 3: Implement sleep()**

```ts
// src/util.ts
export const util = {
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Write test for deferred()**

```ts
// Append to test/util.test.ts
describe('util.deferred', () => {
  it('should create PromiseWithResolvers', async () => {
    const { util } = await import('../src/util.js')
    const d = util.deferred<number>()
    
    assert.ok('promise' in d)
    assert.ok('resolve' in d)
    assert.ok('reject' in d)
    
    setTimeout(() => d.resolve(42), 10)
    const result = await d.promise
    assert.strictEqual(result, 42)
  })

  it('should reject correctly', async () => {
    const { util } = await import('../src/util.js')
    const d = util.deferred<number>()
    
    setTimeout(() => d.reject(new Error('test error')), 10)
    await assert.rejects(d.promise, { message: 'test error' })
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - deferred is not a function

- [ ] **Step 7: Implement deferred()**

```ts
// Update src/util.ts
export const util = {
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },

  deferred<T>(): PromiseWithResolvers<T> {
    return Promise.withResolvers<T>()
  },
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 9: Write test for throttle()**

```ts
// Append to test/util.test.ts
describe('util.throttle', () => {
  it('should throttle function calls', async () => {
    const { util } = await import('../src/util.js')
    let callCount = 0
    const fn = () => { callCount++ }
    const throttled = util.throttle(fn, 50)
    
    throttled()
    throttled()
    throttled()
    
    assert.strictEqual(callCount, 1)
    
    await util.sleep(60)
    throttled()
    assert.strictEqual(callCount, 2)
  })
})
```

- [ ] **Step 10: Implement throttle()**

```ts
// Update src/util.ts - add to util object
throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= wait) {
      lastCall = now
      fn(...args)
    }
  }
},
```

- [ ] **Step 11: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 12: Write test for debounce()**

```ts
// Append to test/util.test.ts
describe('util.debounce', () => {
  it('should debounce function calls', async () => {
    const { util } = await import('../src/util.js')
    let callCount = 0
    const fn = () => { callCount++ }
    const debounced = util.debounce(fn, 30)
    
    debounced()
    debounced()
    debounced()
    
    assert.strictEqual(callCount, 0)
    
    await util.sleep(50)
    assert.strictEqual(callCount, 1)
  })
})
```

- [ ] **Step 13: Implement debounce()**

```ts
// Update src/util.ts - add to util object
debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
},
```

- [ ] **Step 14: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 15: Write test for intersect()**

```ts
// Append to test/util.test.ts
describe('util.intersect', () => {
  it('should copy only existing keys from source to target', async () => {
    const { util } = await import('../src/util.js')
    const target = { a: 1, b: 2, c: 3 }
    const source = { a: 10, d: 40 }
    
    const result = util.intersect(target, source)
    
    assert.deepStrictEqual(result, { a: 10, b: 2, c: 3 })
  })
})
```

- [ ] **Step 16: Implement intersect()**

```ts
// Update src/util.ts - add to util object
intersect<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target }
  for (const key of Object.keys(source) as Array<keyof T>) {
    if (key in target && source[key] !== undefined) {
      result[key] = source[key] as T[keyof T]
    }
  }
  return result
},
```

- [ ] **Step 17: Run all util tests**

Run: `yarn test`
Expected: PASS - All util tests pass

- [ ] **Step 18: Commit**

```bash
git add src/util.ts test/util.test.ts
git commit -m "feat: add util module with helper functions"
```

---

### Task 4: tx.ts - Async Context

**Files:**
- Create: `src/tx.ts`
- Create: `test/tx.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/tx.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('tx', () => {
  it('should store and retrieve values in async context', async () => {
    const { tx } = await import('../src/tx.js')
    
    await tx.run(async () => {
      tx.set('key', 'value')
      assert.strictEqual(tx.get('key'), 'value')
      
      await new Promise(r => setTimeout(r, 10))
      assert.strictEqual(tx.get('key'), 'value')
    })
  })

  it('should isolate contexts', async () => {
    const { tx } = await import('../src/tx.js')
    
    const results: (string | undefined)[] = []
    
    await Promise.all([
      tx.run(async () => {
        tx.set('id', 'context1')
        await new Promise(r => setTimeout(r, 10))
        results.push(tx.get('id'))
      }),
      tx.run(async () => {
        tx.set('id', 'context2')
        await new Promise(r => setTimeout(r, 5))
        results.push(tx.get('id'))
      }),
    ])
    
    assert.ok(results.includes('context1'))
    assert.ok(results.includes('context2'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - Cannot find module

- [ ] **Step 3: Implement tx.ts**

```ts
// src/tx.ts
import { AsyncLocalStorage } from 'node:async_hooks'
import type { RequestHandler } from 'express'
import { randomUUID } from 'node:crypto'

const storage = new AsyncLocalStorage<Map<string, unknown>>()

export const tx = {
  get<T = unknown>(key: string): T | undefined {
    const store = storage.getStore()
    return store?.get(key) as T | undefined
  },

  set(key: string, value: unknown): void {
    const store = storage.getStore()
    store?.set(key, value)
  },

  run<T>(fn: () => T | Promise<T>): T | Promise<T> {
    return storage.run(new Map(), fn)
  },

  init(): RequestHandler {
    return (req, res, next) => {
      storage.run(new Map(), () => {
        tx.set('txid', randomUUID())
        tx.set('req', req)
        tx.set('res', res)
        next()
      })
    }
  },
}

export type Tx = typeof tx
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tx.ts test/tx.test.ts
git commit -m "feat: add tx module for async context"
```

---

### Task 5: event.ts - Event Emitter

**Files:**
- Create: `src/event.ts`
- Create: `test/event.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/event.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('event', () => {
  it('should emit and receive events', async () => {
    const { event } = await import('../src/event.js')
    
    let received: unknown = null
    event.on('test', (data) => { received = data })
    event.emit('test', { foo: 'bar' })
    
    assert.deepStrictEqual(received, { foo: 'bar' })
  })

  it('should support multiple handlers', async () => {
    const { event } = await import('../src/event.js')
    
    const results: number[] = []
    event.on('multi', () => results.push(1))
    event.on('multi', () => results.push(2))
    event.emit('multi', null)
    
    assert.deepStrictEqual(results, [1, 2])
  })

  it('should remove handler with off()', async () => {
    const { event } = await import('../src/event.js')
    
    let count = 0
    const handler = () => { count++ }
    
    event.on('removable', handler)
    event.emit('removable', null)
    assert.strictEqual(count, 1)
    
    event.off('removable', handler)
    event.emit('removable', null)
    assert.strictEqual(count, 1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - Cannot find module

- [ ] **Step 3: Implement event.ts**

```ts
// src/event.ts
type EventHandler<T = unknown> = (data: T) => void | Promise<void>

const handlers = new Map<string, Set<EventHandler>>()

export const event = {
  emit(name: string, data: unknown): void {
    const set = handlers.get(name)
    if (!set) return
    for (const handler of set) {
      try {
        handler(data)
      } catch (err) {
        console.error(`event: handler error for ${name}`, err)
      }
    }
  },

  on<T = unknown>(name: string, handler: EventHandler<T>): void {
    if (!handlers.has(name)) {
      handlers.set(name, new Set())
    }
    handlers.get(name)!.add(handler as EventHandler)
  },

  off(name: string, handler: EventHandler): void {
    const set = handlers.get(name)
    set?.delete(handler)
  },
}

export type Event = typeof event
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/event.ts test/event.test.ts
git commit -m "feat: add event module for pub/sub"
```

---

### Task 6: logger.ts - Structured Logging

**Files:**
- Create: `src/logger.ts`
- Create: `test/logger.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/logger.test.ts
import { describe, it, mock } from 'node:test'
import assert from 'node:assert'

describe('logger', () => {
  it('should have all log levels', async () => {
    const { logger } = await import('../src/logger.js')
    
    assert.ok(typeof logger.emerg === 'function')
    assert.ok(typeof logger.alert === 'function')
    assert.ok(typeof logger.crit === 'function')
    assert.ok(typeof logger.error === 'function')
    assert.ok(typeof logger.warn === 'function')
    assert.ok(typeof logger.notice === 'function')
    assert.ok(typeof logger.info === 'function')
    assert.ok(typeof logger.debug === 'function')
  })

  it('should output JSON format', async () => {
    const { createLogger } = await import('../src/logger.js')
    
    let output = ''
    const logger = createLogger({
      service: 'test-service',
      transporter: 'console:debug',
      output: (str: string) => { output = str },
    })
    
    logger.info('test message', { extra: 'data' })
    
    const parsed = JSON.parse(output)
    assert.strictEqual(parsed.level, 'info')
    assert.strictEqual(parsed.message, 'test message')
    assert.strictEqual(parsed.service, 'test-service')
    assert.deepStrictEqual(parsed.payload, { extra: 'data' })
    assert.ok(parsed.timestamp)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - Cannot find module

- [ ] **Step 3: Implement logger.ts**

```ts
// src/logger.ts
type LogLevel = 'emerg' | 'alert' | 'crit' | 'error' | 'warn' | 'notice' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  service: string
  txid?: string
  payload?: Record<string, unknown>
}

interface LoggerOptions {
  service?: string
  transporter?: string
  output?: (str: string) => void
}

const LEVELS: Record<LogLevel, number> = {
  emerg: 0,
  alert: 1,
  crit: 2,
  error: 3,
  warn: 4,
  notice: 5,
  info: 6,
  debug: 7,
}

function parseTransporter(config: string): { name: string; level: LogLevel } {
  const [name, level = 'debug'] = config.split(':')
  return { name, level: level as LogLevel }
}

export function createLogger(options: LoggerOptions = {}) {
  const { service = 'unknown', transporter = 'console:debug', output } = options
  const { level: minLevel } = parseTransporter(transporter)

  const write = output ?? ((str: string) => console.log(str))

  function log(level: LogLevel, message: string, payload?: Record<string, unknown>) {
    if (LEVELS[level] > LEVELS[minLevel]) return

    let txid: string | undefined
    try {
      const { tx } = require('./tx.js')
      txid = tx.get('txid')
    } catch {
      // tx not available
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service,
      ...(txid && { txid }),
      ...(payload && { payload }),
    }

    write(JSON.stringify(entry))
  }

  return {
    emerg: (msg: string, payload?: Record<string, unknown>) => log('emerg', msg, payload),
    alert: (msg: string, payload?: Record<string, unknown>) => log('alert', msg, payload),
    crit: (msg: string, payload?: Record<string, unknown>) => log('crit', msg, payload),
    error: (msg: string, payload?: Record<string, unknown>) => log('error', msg, payload),
    warn: (msg: string, payload?: Record<string, unknown>) => log('warn', msg, payload),
    notice: (msg: string, payload?: Record<string, unknown>) => log('notice', msg, payload),
    info: (msg: string, payload?: Record<string, unknown>) => log('info', msg, payload),
    debug: (msg: string, payload?: Record<string, unknown>) => log('debug', msg, payload),
  }
}

// Default logger instance (will be initialized by config)
export let logger = createLogger()

export function initLogger(options: LoggerOptions): void {
  logger = createLogger(options)
}

export type Logger = ReturnType<typeof createLogger>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/logger.ts test/logger.test.ts
git commit -m "feat: add logger module with structured logging"
```

---

### Task 7: config.ts - Configuration with Zod

**Files:**
- Create: `src/config.ts`
- Create: `test/config.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/config.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('config', () => {
  it('should have default values', async () => {
    const { config } = await import('../src/config.js')
    
    assert.strictEqual(config.port, 3000)
    assert.strictEqual(config.env, 'local')
    assert.strictEqual(config.secret, 'terces')
    assert.strictEqual(config.cors_origin, '*')
  })

  it('should have deferred promises', async () => {
    const { deferred } = await import('../src/config.js')
    
    assert.ok(deferred.config)
    assert.ok(deferred.setup)
    assert.ok(typeof deferred.config.resolve === 'function')
    assert.ok(typeof deferred.setup.resolve === 'function')
  })

  it('should validate with configSchema', async () => {
    const { configSchema } = await import('../src/config.js')
    
    const result = configSchema.safeParse({
      service: 'test-service',
      port: 8080,
      env: 'prod',
    })
    
    assert.ok(result.success)
    if (result.success) {
      assert.strictEqual(result.data.service, 'test-service')
      assert.strictEqual(result.data.port, 8080)
      assert.strictEqual(result.data.env, 'prod')
    }
  })

  it('should reject invalid env', async () => {
    const { configSchema } = await import('../src/config.js')
    
    const result = configSchema.safeParse({
      service: 'test',
      env: 'invalid',
    })
    
    assert.strictEqual(result.success, false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - Cannot find module

- [ ] **Step 3: Implement config.ts**

```ts
// src/config.ts
import { z } from 'zod'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const configSchema = z.object({
  service: z.string().default('unknown'),
  port: z.coerce.number().default(3000),
  env: z.enum(['local', 'dev', 'staging', 'prod']).default('local'),
  secret: z.string().default('terces'),

  cors_origin: z.string().default('*'),

  seek_static: z.string().default('static'),
  seek_public: z.string().default('public'),
  seek_views: z.string().default('views'),
  seek_tasks: z.string().default('tasks'),
  seek_routers: z.string().default('routers'),
  seek_events: z.string().default('events'),

  logger_transporter: z.string().default('console:debug'),

  vanguard_detector: z.string().default('token, cookie'),
  vanguard_supervisor: z.string().default(''),

  mongo_uri: z.string().optional(),
  redis_uri: z.string().optional(),
  kafka_broker_uri: z.string().optional(),

  jwt_expires_in: z.string().optional(),
  jwt_algorithm: z.string().default('HS256'),

  slack_token: z.string().optional(),
  slack_default_channel: z.string().optional(),
  telegram_token: z.string().optional(),
  sheet_credential: z.string().optional(),

  task_trip_max: z.coerce.number().default(10),
  task_loop_max: z.coerce.number().default(100),

  router_prefix: z.string().optional(),
  rio_monitor: z.boolean().default(false),
  api_monitor: z.boolean().default(false),
  enable_teardown: z.boolean().default(true),

  app_dir: z.string().default(process.cwd()),
})

export type Config = z.infer<typeof configSchema>

export const deferred = {
  config: Promise.withResolvers<void>(),
  setup: Promise.withResolvers<void>(),
}

async function loadConfigFile(filepath: string): Promise<Record<string, unknown>> {
  try {
    const url = pathToFileURL(filepath).href
    const mod = await import(url)
    return mod.default ?? mod
  } catch {
    return {}
  }
}

async function loadConfig(): Promise<Config> {
  const appDir = process.cwd()
  
  // Load config files
  const baseConfig = await loadConfigFile(path.join(appDir, 'config.js'))
  const overrideConfig = await loadConfigFile(path.join(appDir, 'config.override.js'))

  // Merge with env vars
  const merged = {
    ...baseConfig,
    ...overrideConfig,
    ...Object.fromEntries(
      Object.entries(process.env)
        .filter(([k]) => k.toLowerCase() in configSchema.shape || configSchema.shape[k as keyof typeof configSchema.shape])
        .map(([k, v]) => [k.toLowerCase(), v])
    ),
    app_dir: appDir,
  }

  const result = configSchema.safeParse(merged)
  
  if (!result.success) {
    console.error('config: validation failed', result.error.issues)
    return configSchema.parse({})
  }

  return result.data
}

export const config: Config = await loadConfig()
deferred.config.resolve()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.ts test/config.test.ts
git commit -m "feat: add config module with Zod validation"
```

---

### Task 8: jwt.ts - JWT Utilities

**Files:**
- Create: `src/jwt.ts`
- Create: `test/jwt.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/jwt.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('jwt', () => {
  it('should sign and verify token', async () => {
    const { jwt } = await import('../src/jwt.js')
    
    const payload = { userId: 123, role: 'admin' }
    const token = await jwt.sign(payload)
    
    assert.ok(typeof token === 'string')
    assert.ok(token.split('.').length === 3)
    
    const decoded = await jwt.verify<typeof payload>(token)
    assert.strictEqual(decoded.userId, 123)
    assert.strictEqual(decoded.role, 'admin')
  })

  it('should use custom secret', async () => {
    const { jwt } = await import('../src/jwt.js')
    
    const token = await jwt.sign({ data: 1 }, { secret: 'custom-secret' })
    const decoded = await jwt.verify(token, { secret: 'custom-secret' })
    assert.strictEqual(decoded.data, 1)
    
    await assert.rejects(
      jwt.verify(token, { secret: 'wrong-secret' }),
      /signature/i
    )
  })

  it('should decode without verification', async () => {
    const { jwt } = await import('../src/jwt.js')
    
    const token = await jwt.sign({ foo: 'bar' })
    const decoded = jwt.decode<{ foo: string }>(token)
    
    assert.strictEqual(decoded?.foo, 'bar')
  })

  it('should return null for invalid token decode', async () => {
    const { jwt } = await import('../src/jwt.js')
    
    const decoded = jwt.decode('invalid-token')
    assert.strictEqual(decoded, null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - Cannot find module

- [ ] **Step 3: Implement jwt.ts**

```ts
// src/jwt.ts
import * as jose from 'jose'
import { config } from './config.js'

export interface JwtPayload {
  [key: string]: unknown
}

interface SignOptions {
  expiresIn?: string
  secret?: string
  algorithm?: string
}

interface VerifyOptions {
  secret?: string
  algorithms?: string[]
}

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

export const jwt = {
  async sign(payload: JwtPayload, options: SignOptions = {}): Promise<string> {
    const {
      expiresIn = '1000y',
      secret = config.secret,
      algorithm = config.jwt_algorithm ?? 'HS256',
    } = options

    const secretKey = getSecretKey(secret)

    return new jose.SignJWT(payload)
      .setProtectedHeader({ alg: algorithm })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secretKey)
  },

  async verify<T extends JwtPayload = JwtPayload>(
    token: string,
    options: VerifyOptions = {}
  ): Promise<T> {
    const { secret = config.secret, algorithms = ['HS256'] } = options

    const secretKey = getSecretKey(secret)

    const { payload } = await jose.jwtVerify(token, secretKey, { algorithms })

    return payload as T
  },

  decode<T extends JwtPayload = JwtPayload>(token: string): T | null {
    try {
      return jose.decodeJwt(token) as T
    } catch {
      return null
    }
  },
}

export type Jwt = typeof jwt
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/jwt.ts test/jwt.test.ts
git commit -m "feat: add jwt module with jose"
```

---

## Phase 3: HTTP Modules

### Task 9: vanguard.ts - Auth Middleware

**Files:**
- Create: `src/vanguard.ts`
- Create: `test/vanguard.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/vanguard.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('vanguard', () => {
  it('should detect token from Authorization header', async () => {
    const { vanguard } = await import('../src/vanguard.js')
    const { jwt } = await import('../src/jwt.js')
    
    const token = await jwt.sign({ uid: '123' })
    const middleware = vanguard.detect()
    
    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
    } as any
    const res = {} as any
    
    await new Promise<void>((resolve) => {
      middleware(req, res, () => {
        resolve()
      })
    })
    
    assert.strictEqual(req.auth?.uid, '123')
  })

  it('should detect token from cookie', async () => {
    const { vanguard } = await import('../src/vanguard.js')
    const { jwt } = await import('../src/jwt.js')
    
    const token = await jwt.sign({ uid: '456' })
    const middleware = vanguard.detect()
    
    const req = {
      headers: {},
      cookies: { token },
    } as any
    const res = {} as any
    
    await new Promise<void>((resolve) => {
      middleware(req, res, () => resolve())
    })
    
    assert.strictEqual(req.auth?.uid, '456')
  })

  it('should have supervisor tiat', async () => {
    const { vanguard } = await import('../src/vanguard.js')
    
    assert.ok(vanguard.supervisors.tiat)
    
    const middleware = vanguard.supervisors.tiat()
    
    // Without auth - should return 401
    const req1 = { auth: undefined } as any
    const res1 = {
      status: (code: number) => ({
        json: (body: any) => {
          assert.strictEqual(code, 401)
        }
      })
    } as any
    
    middleware(req1, res1, () => assert.fail('should not call next'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - Cannot find module

- [ ] **Step 3: Implement vanguard.ts**

```ts
// src/vanguard.ts
import type { RequestHandler, Request } from 'express'
import { jwt } from './jwt.js'
import { config } from './config.js'

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export interface AuthPayload {
  uid?: string
  sid?: string
  roles?: string[]
  [key: string]: unknown
}

type Detector = (req: Request) => Promise<string | null>

const detectors: Record<string, Detector> = {
  async token(req) {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return null
    return header.slice(7)
  },

  async cookie(req) {
    return req.cookies?.token ?? null
  },

  async client(req) {
    return (req.headers['x-client-token'] as string) ?? null
  },
}

const supervisors: Record<string, () => RequestHandler> = {
  tiat: () => (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: { message: 'Unauthorized' } })
    }
    next()
  },

  internal: () => (req, res, next) => {
    const secret = req.headers['x-internal-secret']
    if (secret !== config.secret) {
      return res.status(403).json({ error: { message: 'Forbidden' } })
    }
    next()
  },

  login: () => (req, res, next) => {
    if (!req.auth?.uid) {
      return res.status(401).json({ error: { message: 'Login required' } })
    }
    next()
  },
}

export const vanguard = {
  detect(): RequestHandler {
    const enabledDetectors = config.vanguard_detector
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)

    return async (req, _res, next) => {
      for (const name of enabledDetectors) {
        const detector = detectors[name]
        if (!detector) continue

        const token = await detector(req)
        if (!token) continue

        try {
          req.auth = await jwt.verify<AuthPayload>(token)
          break
        } catch {
          // Invalid token, try next detector
        }
      }
      next()
    }
  },

  supervise(): RequestHandler {
    const enabledSupervisors = config.vanguard_supervisor
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const middlewares = enabledSupervisors
      .map((name) => supervisors[name]?.())
      .filter(Boolean) as RequestHandler[]

    return (req, res, next) => {
      if (middlewares.length === 0) return next()
      
      let index = 0
      const run = (): void => {
        if (index >= middlewares.length) return next()
        middlewares[index++](req, res, run)
      }
      run()
    }
  },

  supervisors,
  detectors,
}

export type Vanguard = typeof vanguard
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/vanguard.ts test/vanguard.test.ts
git commit -m "feat: add vanguard module for auth middleware"
```

---

### Task 10: request.ts - HTTP Client

**Files:**
- Create: `src/request.ts`
- Create: `test/request.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/request.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('request', () => {
  it('should have all HTTP methods', async () => {
    const { request } = await import('../src/request.js')
    
    assert.ok(typeof request.get === 'function')
    assert.ok(typeof request.post === 'function')
    assert.ok(typeof request.put === 'function')
    assert.ok(typeof request.patch === 'function')
    assert.ok(typeof request.delete === 'function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - Cannot find module

- [ ] **Step 3: Implement request.ts**

```ts
// src/request.ts
import { config } from './config.js'

interface RequestOptions {
  headers?: Record<string, string>
  timeout?: number
}

async function doFetch<T>(
  method: string,
  url: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const { headers = {}, timeout = 30000 } = options
  
  const fullUrl = url.startsWith('http') 
    ? url 
    : `${config.request_base ?? ''}${url}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number }
      error.status = response.status
      throw error
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>
    }

    return response.text() as unknown as T
  } finally {
    clearTimeout(timeoutId)
  }
}

export const request = {
  get<T = unknown>(url: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<T> {
    const searchParams = params ? '?' + new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString() : ''
    return doFetch<T>('GET', url + searchParams, undefined, options)
  },

  post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return doFetch<T>('POST', url, body, options)
  },

  put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return doFetch<T>('PUT', url, body, options)
  },

  patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return doFetch<T>('PATCH', url, body, options)
  },

  delete<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return doFetch<T>('DELETE', url, body, options)
  },
}

export type Request = typeof request
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/request.ts test/request.test.ts
git commit -m "feat: add request module with native fetch"
```

---

### Task 11: schedule.ts - Cron Scheduling

**Files:**
- Create: `src/schedule.ts`
- Create: `test/schedule.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/schedule.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('schedule', () => {
  it('should create a cron job', async () => {
    const { schedule } = await import('../src/schedule.js')
    
    let called = false
    const job = schedule.add('* * * * * *', () => {
      called = true
    })
    
    assert.ok(job)
    assert.ok(typeof job.stop === 'function')
    
    // Wait for potential execution
    await new Promise(r => setTimeout(r, 1100))
    
    job.stop()
    assert.ok(called)
  })

  it('should remove a job', async () => {
    const { schedule } = await import('../src/schedule.js')
    
    let count = 0
    const job = schedule.add('* * * * * *', () => { count++ })
    
    await new Promise(r => setTimeout(r, 1100))
    schedule.remove(job)
    
    const countAfterStop = count
    await new Promise(r => setTimeout(r, 1100))
    
    assert.strictEqual(count, countAfterStop)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL - Cannot find module

- [ ] **Step 3: Implement schedule.ts**

```ts
// src/schedule.ts
import { CronJob } from 'cron'
import { logger } from './logger.js'

export const schedule = {
  add(
    expr: string,
    handler: () => void | Promise<void>,
    options: { timezone?: string } = {}
  ): CronJob {
    const job = CronJob.from({
      cronTime: expr,
      onTick: async () => {
        try {
          await handler()
        } catch (err) {
          logger.error('schedule: job error', { error: err, expr })
        }
      },
      start: true,
      timeZone: options.timezone,
    })

    return job
  },

  remove(job: CronJob): void {
    job.stop()
  },
}

export type Schedule = typeof schedule
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/schedule.ts test/schedule.test.ts
git commit -m "feat: add schedule module with cron"
```

---

### Task 12: rio.ts - Express Utilities

**Files:**
- Create: `src/rio.ts`

- [ ] **Step 1: Create rio.ts**

```ts
// src/rio.ts
import type { RequestHandler, Request, Response } from 'express'
import { config } from './config.js'
import { tx } from './tx.js'
import { logger } from './logger.js'

declare global {
  namespace Express {
    interface Response {
      success: (data?: unknown) => void
      error: (message: string, status?: number) => void
    }
    interface Request {
      u: {
        emit: (event: string, data: unknown) => void
      }
    }
  }
}

export const rio = {
  cors(): RequestHandler {
    return (req, res, next) => {
      const origin = config.cors_origin === '*' 
        ? '*' 
        : config.cors_origin.split(',').find(o => o === req.headers.origin) ?? ''

      res.header('Access-Control-Allow-Origin', origin)
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      res.header('Access-Control-Allow-Credentials', 'true')

      if (req.method === 'OPTIONS') {
        return res.sendStatus(204)
      }
      next()
    }
  },

  base(): RequestHandler {
    return (req, res, next) => {
      res.success = (data?: unknown) => {
        res.json({ data })
      }

      res.error = (message: string, status = 400) => {
        res.status(status).json({
          error: {
            message,
            service: config.service,
            txid: tx.get('txid'),
          },
        })
      }

      next()
    }
  },

  util(): RequestHandler {
    return (req, res, next) => {
      req.u = {
        emit: (event: string, data: unknown) => {
          logger.debug(`event: ${event}`, { data })
        },
      }
      next()
    }
  },

  auth(): RequestHandler {
    return (req, res, next) => {
      next()
    }
  },

  monitor(): RequestHandler {
    return (req, res, next) => {
      const start = Date.now()
      res.on('finish', () => {
        const duration = Date.now() - start
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`)
      })
      next()
    }
  },

  default(): RequestHandler {
    return (req, res, next) => {
      if (req.path === '/_status' || req.path === '/_health') {
        return res.json({
          service: config.service,
          env: config.env,
          status: 'ok',
          timestamp: new Date().toISOString(),
        })
      }
      next()
    }
  },
}

export type Rio = typeof rio
```

- [ ] **Step 2: Commit**

```bash
git add src/rio.ts
git commit -m "feat: add rio module for Express utilities"
```

---

### Task 13: router.ts - Express Router Wrapper

**Files:**
- Create: `src/router.ts`

- [ ] **Step 1: Create router.ts**

```ts
// src/router.ts
import { Router as ExpressRouter, type RequestHandler, type IRouter } from 'express'

type AsyncHandler = (
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2]
) => Promise<unknown>

function wrapAsync(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function Router(): IRouter {
  const router = ExpressRouter()

  const originalGet = router.get.bind(router)
  const originalPost = router.post.bind(router)
  const originalPut = router.put.bind(router)
  const originalPatch = router.patch.bind(router)
  const originalDelete = router.delete.bind(router)

  const wrap = (method: typeof originalGet) => {
    return (path: string, ...handlers: (RequestHandler | AsyncHandler)[]) => {
      const wrappedHandlers = handlers.map((h) =>
        h.constructor.name === 'AsyncFunction' ? wrapAsync(h as AsyncHandler) : h
      )
      return method(path, ...wrappedHandlers)
    }
  }

  router.get = wrap(originalGet) as typeof router.get
  router.post = wrap(originalPost) as typeof router.post
  router.put = wrap(originalPut) as typeof router.put
  router.patch = wrap(originalPatch) as typeof router.patch
  router.delete = wrap(originalDelete) as typeof router.delete

  return router
}

export type { IRouter }
```

- [ ] **Step 2: Commit**

```bash
git add src/router.ts
git commit -m "feat: add router module with async wrapper"
```

---

## Phase 4: Database Modules

### Task 14: redis.ts - Redis Client

**Files:**
- Create: `src/redis.ts`

- [ ] **Step 1: Create redis.ts**

```ts
// src/redis.ts
import { createClient, type RedisClientType } from 'redis'
import { config } from './config.js'
import { logger } from './logger.js'

let client: RedisClientType | null = null
let teardownRegistered = false

async function getClient(): Promise<RedisClientType> {
  if (client?.isOpen) return client

  if (!config.redis_uri) {
    throw new Error('redis: config.redis_uri is required')
  }

  client = createClient({ url: config.redis_uri })

  client.on('error', (err) => logger.error('redis: connection error', { error: String(err) }))

  await client.connect()
  logger.info(`redis: connected - ${config.redis_uri}`)

  if (!teardownRegistered) {
    teardownRegistered = true
    // Teardown will be registered by cardinal
  }

  return client
}

export const redis = {
  get client() {
    return client
  },

  async cmd<T = unknown>(...args: [string, ...unknown[]]): Promise<T> {
    const c = await getClient()
    return c.sendCommand(args as [string]) as Promise<T>
  },

  async get<T = string>(key: string): Promise<T | null> {
    const c = await getClient()
    const value = await c.get(key)
    return value as T | null
  },

  async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
    const c = await getClient()
    await c.set(key, value, options)
  },

  async del(key: string): Promise<number> {
    const c = await getClient()
    return c.del(key)
  },

  async expire(key: string, seconds: number): Promise<boolean> {
    const c = await getClient()
    return c.expire(key, seconds)
  },

  async hget(key: string, field: string): Promise<string | null> {
    const c = await getClient()
    return c.hGet(key, field) ?? null
  },

  async hset(key: string, field: string, value: string): Promise<number> {
    const c = await getClient()
    return c.hSet(key, field, value)
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    const c = await getClient()
    return c.hGetAll(key)
  },

  async hdel(key: string, field: string): Promise<number> {
    const c = await getClient()
    return c.hDel(key, field)
  },

  async pub(channel: string, message: string | object): Promise<number> {
    const c = await getClient()
    const payload = typeof message === 'string' ? message : JSON.stringify(message)
    return c.publish(channel, payload)
  },

  async sub(channel: string, callback: (message: string) => void): Promise<void> {
    const c = await getClient()
    const subscriber = c.duplicate()
    await subscriber.connect()
    await subscriber.subscribe(channel, callback)
  },

  async disconnect(): Promise<void> {
    if (client?.isOpen) {
      await client.quit()
      logger.info('redis: disconnected')
    }
  },
}

export type Redis = typeof redis
```

- [ ] **Step 2: Commit**

```bash
git add src/redis.ts
git commit -m "feat: add redis module"
```

---

### Task 15: mongoose.ts - MongoDB ODM

**Files:**
- Create: `src/mongoose.ts`

- [ ] **Step 1: Create mongoose.ts**

```ts
// src/mongoose.ts
import mongoose, {
  Schema as MongooseSchema,
  model as mongooseModel,
  type Model,
  type SchemaDefinition,
  type SchemaOptions,
} from 'mongoose'
import { config } from './config.js'
import { logger } from './logger.js'

let connected = false

async function connect(): Promise<void> {
  if (connected) return

  if (!config.mongo_uri) {
    throw new Error('mongoose: config.mongo_uri is required')
  }

  await mongoose.connect(config.mongo_uri, { authSource: 'admin' })
  connected = true
  logger.info(`mongoose: connected - ${config.mongo_uri}`)
}

export function Schema<T>(
  definition: SchemaDefinition<T>,
  options?: SchemaOptions
): MongooseSchema<T> {
  return new MongooseSchema<T>(definition, {
    timestamps: true,
    ...options,
  })
}

export function model<T>(
  name: string,
  schema: MongooseSchema<T>,
  collection?: string
): Model<T> {
  connect().catch((err) => logger.error('mongoose: auto-connect failed', { error: String(err) }))
  return mongooseModel<T>(name, schema, collection)
}

export async function disconnect(): Promise<void> {
  if (connected) {
    await mongoose.disconnect()
    connected = false
    logger.info('mongoose: disconnected')
  }
}

export { mongoose }
export type { Model, SchemaDefinition, SchemaOptions }
```

- [ ] **Step 2: Commit**

```bash
git add src/mongoose.ts
git commit -m "feat: add mongoose module"
```

---

### Task 16: Remaining Modules (lock, cacher, counter, task, kafka, slack, telegram, socket, scanner, cardinal, create, gateway, query, sheet, ui)

**Files:**
- Create all remaining `src/*.ts` files

- [ ] **Step 1: Create lock.ts**

```ts
// src/lock.ts
import { redis } from './redis.js'
import { randomUUID } from 'node:crypto'

export const lock = {
  async acquire(key: string, ttl: number): Promise<boolean> {
    const lockKey = `lock:${key}`
    const value = randomUUID()
    const result = await redis.set(lockKey, value, { EX: ttl })
    return result !== null
  },

  async release(key: string): Promise<void> {
    await redis.del(`lock:${key}`)
  },

  async using<T>(key: string, fn: () => Promise<T>, ttl = 30): Promise<T> {
    const acquired = await lock.acquire(key, ttl)
    if (!acquired) {
      throw new Error(`lock: failed to acquire lock for ${key}`)
    }
    try {
      return await fn()
    } finally {
      await lock.release(key)
    }
  },
}

export type Lock = typeof lock
```

- [ ] **Step 2: Create cacher.ts**

```ts
// src/cacher.ts
import type { RequestHandler } from 'express'
import { redis } from './redis.js'
import { createHash } from 'node:crypto'

function md5(str: string): string {
  return createHash('md5').update(str).digest('hex')
}

export const cacher = {
  middle(options: { expire?: number; prefix?: string } = {}): RequestHandler {
    const { expire = 173200, prefix = '' } = options

    return async (req, res, next) => {
      const key = `cacher:middle:${prefix}:${req.baseUrl}${req.path}:${md5(JSON.stringify(req.query))}`

      try {
        const cached = await redis.get(key)
        if (cached) {
          res.setHeader('X-Cache', 'HIT')
          return res.json(JSON.parse(cached))
        }
      } catch {
        // Redis not available, continue without cache
      }

      const originalJson = res.json.bind(res)
      res.json = (body: unknown) => {
        redis.set(key, JSON.stringify(body), { EX: expire }).catch(() => {})
        res.setHeader('X-Cache', 'MISS')
        return originalJson(body)
      }

      next()
    }
  },

  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.cmd<string[]>('KEYS', `cacher:*${pattern}*`)
    if (keys.length > 0) {
      await Promise.all(keys.map((k) => redis.del(k)))
    }
  },
}

export type Cacher = typeof cacher
```

- [ ] **Step 3: Create counter.ts**

```ts
// src/counter.ts
import { model, Schema } from './mongoose.js'

interface ICounter {
  _id: string
  value: number
}

const counterSchema = Schema<ICounter>(
  {
    _id: { type: String, required: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: false }
)

const Counter = model<ICounter>('Counter', counterSchema, 'counters')

export const counter = {
  async get(key: string): Promise<number> {
    const doc = await Counter.findByIdAndUpdate(
      key,
      { $inc: { value: 1 } },
      { upsert: true, new: true }
    )
    return doc.value
  },

  async set(key: string, value: number): Promise<void> {
    await Counter.findByIdAndUpdate(key, { value }, { upsert: true })
  },
}

export type CounterType = typeof counter
```

- [ ] **Step 4: Create kafka.ts**

```ts
// src/kafka.ts
import { Kafka, type Producer, type Consumer } from 'kafkajs'
import { config } from './config.js'
import { logger } from './logger.js'

let kafka: Kafka | null = null
let producer: Producer | null = null
let consumer: Consumer | null = null

export async function getKafka(): Promise<Kafka> {
  if (kafka) return kafka

  if (!config.kafka_broker_uri) {
    throw new Error('kafka: config.kafka_broker_uri is required')
  }

  kafka = new Kafka({
    clientId: config.service,
    brokers: config.kafka_broker_uri.split(','),
  })

  return kafka
}

export async function getProducer(): Promise<Producer> {
  if (producer) return producer

  const k = await getKafka()
  producer = k.producer()
  await producer.connect()
  logger.info('kafka: producer connected')

  return producer
}

export async function getConsumer(): Promise<Consumer> {
  if (consumer) return consumer

  const k = await getKafka()
  consumer = k.consumer({ groupId: config.service })
  await consumer.connect()
  logger.info('kafka: consumer connected')

  return consumer
}

export async function disconnectKafka(): Promise<void> {
  if (producer) {
    await producer.disconnect()
    logger.info('kafka: producer disconnected')
  }
  if (consumer) {
    await consumer.disconnect()
    logger.info('kafka: consumer disconnected')
  }
}
```

- [ ] **Step 5: Create task.ts**

```ts
// src/task.ts
import { getProducer, getConsumer } from './kafka.js'
import { config } from './config.js'
import { logger } from './logger.js'

interface TaskMeta {
  sender: string
  trips: string[]
  loop: number
  timestamp: number
}

type TaskHandler<T = unknown> = (data: T, meta: TaskMeta) => void | Promise<void>

const handlers = new Map<string, TaskHandler>()

export const task = {
  async on<T = unknown>(name: string, handler: TaskHandler<T>): Promise<void> {
    handlers.set(name, handler as TaskHandler)

    const consumer = await getConsumer()
    await consumer.subscribe({ topic: name, fromBeginning: false })

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const h = handlers.get(topic)
        if (!h || !message.value) return

        try {
          const payload = JSON.parse(message.value.toString())
          const { data, meta } = payload

          if (meta.loop > config.task_loop_max) {
            logger.warn(`task: loop limit exceeded for ${topic}`)
            return
          }

          await h(data, meta)
        } catch (err) {
          logger.error(`task: handler error for ${topic}`, { error: String(err) })
        }
      },
    })
  },

  async emit<T = unknown>(name: string, data: T): Promise<void> {
    const producer = await getProducer()

    const meta: TaskMeta = {
      sender: config.service,
      trips: [config.service],
      loop: 0,
      timestamp: Date.now(),
    }

    await producer.send({
      topic: name,
      messages: [{ value: JSON.stringify({ data, meta }) }],
    })
  },
}

export type Task = typeof task
export type { TaskMeta, TaskHandler }
```

- [ ] **Step 6: Create slack.ts**

```ts
// src/slack.ts
import { config } from './config.js'
import { request } from './request.js'

interface SlackOptions {
  channel?: string
}

export const slack = {
  async send(message: string, options: SlackOptions = {}): Promise<void> {
    if (!config.slack_token) {
      throw new Error('slack: config.slack_token is required')
    }

    const channel = options.channel ?? config.slack_default_channel
    if (!channel) {
      throw new Error('slack: channel is required')
    }

    await request.post(
      'https://slack.com/api/chat.postMessage',
      { channel, text: message },
      { headers: { Authorization: `Bearer ${config.slack_token}` } }
    )
  },
}

export type Slack = typeof slack
```

- [ ] **Step 7: Create telegram.ts**

```ts
// src/telegram.ts
import { config } from './config.js'
import { request } from './request.js'

export const telegram = {
  async send(chatId: string, text: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!config.telegram_token) {
      throw new Error('telegram: config.telegram_token is required')
    }

    return telegram.method('sendMessage', { chat_id: chatId, text, ...params })
  },

  async method(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!config.telegram_token) {
      throw new Error('telegram: config.telegram_token is required')
    }

    const url = `https://api.telegram.org/bot${config.telegram_token}/${method}`
    return request.post(url, params)
  },
}

export type Telegram = typeof telegram
```

- [ ] **Step 8: Create socket.ts**

```ts
// src/socket.ts
import { redis } from './redis.js'
import { config } from './config.js'

interface EmitOptions {
  sid?: string
  uid?: string
  room?: string
}

export const socket = {
  async emit(event: string, data: unknown, options: EmitOptions = {}): Promise<void> {
    const channel = config.websocket_emitter ?? 'socket/in/emitter'
    await redis.pub(channel, { event, data, ...options })
  },
}

export type Socket = typeof socket
```

- [ ] **Step 9: Create scanner.ts**

```ts
// src/scanner.ts
import path from 'node:path'
import fs from 'node:fs/promises'
import { Router } from './router.js'
import { config } from './config.js'
import { logger } from './logger.js'
import { pathToFileURL } from 'node:url'

async function getFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await getFiles(fullPath)))
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
      files.push(fullPath)
    }
  }

  return files
}

export const scanner = {
  async router(dir: string): Promise<{ router: ReturnType<typeof Router>; paths: string[] }> {
    const router = Router()
    const basePath = path.resolve(config.app_dir, dir)
    const files = await getFiles(basePath)

    for (const file of files) {
      try {
        const url = pathToFileURL(file).href
        const mod = await import(url)
        const subRouter = mod.default ?? mod.router
        
        if (subRouter) {
          const routePath = '/' + path.relative(basePath, file)
            .replace(/\\/g, '/')
            .replace(/\.(js|ts)$/, '')
            .replace(/\/index$/, '')
          
          router.use(routePath === '/' ? '/' : routePath, subRouter)
        }
      } catch (err) {
        logger.error(`scanner: failed to load router ${file}`, { error: String(err) })
      }
    }

    return { router, paths: files }
  },

  async event(): Promise<void> {
    const basePath = path.resolve(config.app_dir, config.seek_events)
    try {
      await fs.access(basePath)
      const files = await getFiles(basePath)
      for (const file of files) {
        try {
          const url = pathToFileURL(file).href
          await import(url)
        } catch (err) {
          logger.error(`scanner: failed to load event ${file}`, { error: String(err) })
        }
      }
      logger.info(`scanner: loaded ${files.length} events`)
    } catch {
      // Directory doesn't exist, skip
    }
  },

  async task(): Promise<void> {
    const basePath = path.resolve(config.app_dir, config.seek_tasks)
    try {
      await fs.access(basePath)
      const files = await getFiles(basePath)
      for (const file of files) {
        try {
          const url = pathToFileURL(file).href
          await import(url)
        } catch (err) {
          logger.error(`scanner: failed to load task ${file}`, { error: String(err) })
        }
      }
      logger.info(`scanner: loaded ${files.length} tasks`)
    } catch {
      // Directory doesn't exist, skip
    }
  },
}

export type Scanner = typeof scanner
```

- [ ] **Step 10: Create cardinal.ts**

```ts
// src/cardinal.ts
import http from 'node:http'
import path from 'node:path'
import express, { type Application, type ErrorRequestHandler } from 'express'
import cookieParser from 'cookie-parser'
import { config, deferred } from './config.js'
import { scanner } from './scanner.js'
import { logger, initLogger } from './logger.js'
import { tx } from './tx.js'
import { rio } from './rio.js'
import { vanguard } from './vanguard.js'
import { redis } from './redis.js'
import { disconnect as disconnectMongo } from './mongoose.js'
import { disconnectKafka } from './kafka.js'

interface Cardinal {
  app: Application | null
  server: http.Server | null
  teardownHandlers: Array<() => Promise<void>>
  isShuttingDown: boolean
}

const cardinal: Cardinal = {
  app: null,
  server: null,
  teardownHandlers: [],
  isShuttingDown: false,
}

export function teardown(handler: () => Promise<void>): void {
  cardinal.teardownHandlers.push(handler)
}

export async function shutdown(): Promise<void> {
  if (cardinal.isShuttingDown) return

  cardinal.isShuttingDown = true
  const start = Date.now()

  await Promise.all(cardinal.teardownHandlers.map((h) => h().catch(() => {})))
  
  // Disconnect integrations
  await redis.disconnect().catch(() => {})
  await disconnectMongo().catch(() => {})
  await disconnectKafka().catch(() => {})

  logger.info(`cardinal: shutdown completed in ${Date.now() - start}ms`)
}

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const response = {
    message: error.message || 'Unknown error',
    service: config.service,
    env: config.env,
    txid: tx.get('txid'),
    url: req.originalUrl,
    method: req.method,
  }

  const status = error.status || (res.statusCode === 200 ? 400 : res.statusCode)
  res.status(status).json({ error: response })

  logger.error(response.message, { error: String(error), stack: error.stack })
}

export type MiddlewareSetup = (app: Application) => void | Promise<void>

export async function setup(middleware?: MiddlewareSetup): Promise<void> {
  const app = cardinal.app!

  initLogger({ service: config.service, transporter: config.logger_transporter })

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(tx.init())
  app.use(rio.cors())
  app.use(rio.base())
  app.use(rio.util())
  app.use(rio.auth())

  if (config.rio_monitor) {
    app.use(rio.monitor())
  }

  const prefix = config.router_prefix || config.service
  app.use(path.join('/', prefix), rio.default())

  app.use(vanguard.detect())
  app.use(vanguard.supervise())

  if (middleware) {
    await middleware(app)
  }

  // Auto-seek resources
  try {
    const { router, paths } = await scanner.router(config.seek_routers)
    app.use(path.join('/', prefix), router)
    logger.info(`cardinal: loaded ${paths.length} routers`)
  } catch {
    // No routers directory
  }

  await scanner.event()
  await scanner.task()

  // Static files
  try {
    app.use(express.static(path.join(config.app_dir, config.seek_public)))
  } catch {
    // No public directory
  }

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: { message: '404 Not found' } })
  })

  // Error handler
  app.use(errorHandler)

  // Graceful shutdown
  if (config.enable_teardown) {
    for (const signal of ['SIGTERM', 'SIGINT', 'SIGUSR2']) {
      process.on(signal, async () => {
        await shutdown()
        process.exit(0)
      })
    }
  }

  if (config.port) {
    cardinal.server!.listen(config.port, () => {
      logger.info(`cardinal: HTTP server ready - port=${config.port}`)
    })
  }

  deferred.setup.resolve()
}

export function create(middleware?: MiddlewareSetup): {
  app: Application
  server: http.Server
  shutdown: typeof shutdown
} {
  const app = express()
  const server = http.createServer(app)

  cardinal.app = app
  cardinal.server = server

  setup(middleware).catch((err) => {
    logger.error('cardinal: setup failed', { error: String(err) })
  })

  return { app, server, shutdown }
}

export { cardinal }
```

- [ ] **Step 11: Create create.ts**

```ts
// src/create.ts
import { create, shutdown, type MiddlewareSetup } from './cardinal.js'
export { create, shutdown, type MiddlewareSetup }
```

- [ ] **Step 12: Create gateway.ts**

```ts
// src/gateway.ts
import type { RequestHandler } from 'express'
import { request } from './request.js'

interface GatewayOptions {
  target: string
  pathRewrite?: Record<string, string>
}

export function gateway(options: GatewayOptions): RequestHandler {
  return async (req, res, next) => {
    try {
      let targetPath = req.originalUrl

      if (options.pathRewrite) {
        for (const [from, to] of Object.entries(options.pathRewrite)) {
          targetPath = targetPath.replace(new RegExp(from), to)
        }
      }

      const url = `${options.target}${targetPath}`
      const method = req.method.toLowerCase() as keyof typeof request

      const response = await (request as any)[method](url, req.body, {
        headers: req.headers as Record<string, string>,
      })

      res.json(response)
    } catch (err) {
      next(err)
    }
  }
}

export type Gateway = typeof gateway
```

- [ ] **Step 13: Create query.ts**

```ts
// src/query.ts
export function query() {
  return {
    filter: {} as Record<string, unknown>,
    sort: {} as Record<string, 1 | -1>,
    limit: 20,
    skip: 0,

    where(field: string, value: unknown) {
      this.filter[field] = value
      return this
    },

    orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
      this.sort[field] = direction === 'asc' ? 1 : -1
      return this
    },

    take(n: number) {
      this.limit = n
      return this
    },

    offset(n: number) {
      this.skip = n
      return this
    },

    build() {
      return {
        filter: this.filter,
        sort: this.sort,
        limit: this.limit,
        skip: this.skip,
      }
    },
  }
}

export type Query = ReturnType<typeof query>
```

- [ ] **Step 14: Create sheet.ts**

```ts
// src/sheet.ts
import { config } from './config.js'

export const sheet = {
  async doc(id: string): Promise<unknown> {
    if (!config.sheet_credential) {
      throw new Error('sheet: config.sheet_credential is required')
    }
    // Implementation depends on Google Sheets API setup
    // This is a placeholder that would need googleapis package
    return { id, credential: config.sheet_credential }
  },
}

export type Sheet = typeof sheet
```

- [ ] **Step 15: Create ui.ts**

```ts
// src/ui.ts
import type { RequestHandler } from 'express'

export function ui(template: string, data?: Record<string, unknown>): RequestHandler {
  return (req, res) => {
    res.render(template, data)
  }
}

ui.table = (
  model: string,
  inject: (req: unknown, options: unknown) => Promise<unknown>
): RequestHandler => {
  return async (req, res, next) => {
    try {
      const result = await inject(req, {
        query: req.query,
        sort: {},
        project: {},
        limit: 20,
        offset: 0,
      })
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
}

export type UI = typeof ui
```

- [ ] **Step 16: Commit all remaining modules**

```bash
git add src/lock.ts src/cacher.ts src/counter.ts src/kafka.ts src/task.ts src/slack.ts src/telegram.ts src/socket.ts src/scanner.ts src/cardinal.ts src/create.ts src/gateway.ts src/query.ts src/sheet.ts src/ui.ts
git commit -m "feat: add remaining modules (lock, cacher, counter, task, slack, telegram, socket, scanner, cardinal, create, gateway, query, sheet, ui)"
```

---

## Phase 5: Main Entry & Finalization

### Task 17: index.ts - Main Entry

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create index.ts**

```ts
// src/index.ts
// Core exports
export { check, is, checkWith, type CheckError } from './check.js'
export { config, configSchema, deferred, type Config } from './config.js'
export { logger, createLogger, initLogger, type Logger } from './logger.js'
export { util } from './util.js'
export { tx, type Tx } from './tx.js'
export { event, type Event } from './event.js'

// HTTP exports
export { create, shutdown, type MiddlewareSetup } from './create.js'
export { Router, type IRouter } from './router.js'
export { rio, type Rio } from './rio.js'
export { vanguard, type Vanguard, type AuthPayload } from './vanguard.js'

// Utilities
export { jwt, type Jwt, type JwtPayload } from './jwt.js'
export { request, type Request } from './request.js'
export { schedule, type Schedule } from './schedule.js'
```

- [ ] **Step 2: Verify build**

Run: `yarn build`
Expected: Build succeeds with all exports

- [ ] **Step 3: Verify types**

Run: `yarn typecheck`
Expected: No type errors

- [ ] **Step 4: Run all tests**

Run: `yarn test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: add main index.ts with core exports"
```

---

### Task 18: Cleanup & Documentation

**Files:**
- Update: `README.md`
- Delete: Old JS files (after verification)

- [ ] **Step 1: Update README.md**

```markdown
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
```

- [ ] **Step 2: Remove old JS files**

Run: `rm -rf modules/ index.js index.d.ts`
Expected: Old files removed

- [ ] **Step 3: Update .gitignore**

```
node_modules/
dist/
*.log
.env
.env.local
config.override.js
data/
```

- [ ] **Step 4: Final build and test**

Run: `yarn build && yarn test`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: cleanup old JS files, update docs for v3"
```

---

## Summary

This plan implements eroc v3.0 TypeScript migration in 18 tasks:

1. **Phase 1** (Task 1): Project setup with tsconfig, tsup, package.json
2. **Phase 2** (Tasks 2-8): Core modules - check, util, tx, event, logger, config, jwt
3. **Phase 3** (Tasks 9-13): HTTP modules - vanguard, request, schedule, rio, router
4. **Phase 4** (Tasks 14-16): Database & remaining modules - redis, mongoose, lock, cacher, counter, task, kafka, slack, telegram, socket, scanner, cardinal, create, gateway, query, sheet, ui
5. **Phase 5** (Tasks 17-18): Main entry and cleanup

Total estimated time: 3-5 days
