# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**eroc v3** là Express wrapper framework cung cấp batteries-included cho Node.js services. Viết bằng TypeScript, pure ESM, target Node.js 22+.

## Commands

```bash
yarn build         # Build TypeScript với tsup
yarn dev           # Build watch mode
yarn test          # Node.js native test runner
yarn test:coverage # Test với coverage
yarn typecheck     # Type checking
yarn lint          # ESLint + auto-fix
yarn format        # Prettier
```

## Architecture

### Entry Point & Exports

Pure ESM package với subpath exports:

```ts
// Core exports từ main entry
import { create, config, logger, check, util, tx, event } from 'eroc'

// Subpath imports cho optional modules
import { redis } from 'eroc/redis'
import { mongoose } from 'eroc/mongoose'
import { task } from 'eroc/task'
import { kafka } from 'eroc/kafka'
```

### Directory Structure

```
src/                 # TypeScript source files (flat structure)
├── index.ts        # Main entry - exports core modules
├── check.ts        # Assertion helpers (check, is, checkWith)
├── config.ts       # Zod schema config với top-level await
├── logger.ts       # Structured JSON logging
├── util.ts         # Utilities (sleep, deferred, throttle, debounce, maskUri)
├── tx.ts           # AsyncLocalStorage request context (x-txid propagation)
├── event.ts        # Distributed events via Redis pub/sub (channel: event.*)
├── jwt.ts          # JWT: HS256 generic + RS256 access/refresh tokens (jose)
├── internal.ts     # HMAC-signed inter-service auth (replay-protected)
├── health.ts       # k8s probes: /livez /readyz /healthz + custom checks
├── ratelimit.ts    # Sliding-window rate limit (Redis sorted set, fail-open)
├── vanguard.ts     # Auth middleware (detect, supervise: internal, login)
├── request.ts      # HTTP client using native fetch
├── schedule.ts     # Cron scheduling
├── rio.ts          # Express utilities (cors, base with req.gp/res.success, apiLog, monitor)
├── router.ts       # Re-export express Router (Express 5 handles async natively)
├── cardinal.ts     # App factory + lifecycle orchestrator
├── redis.ts        # Redis client (peer dep: redis)
├── mongoose.ts     # MongoDB ODM (peer dep: mongoose)
├── kafka.ts        # Kafka client, consumer-per-topic pub/sub (peer dep: kafkajs)
├── task.ts         # Task queue on Kafka (HMAC-signed, loop/trip protection)
├── lock.ts         # Distributed lock via Redis (token-safe, pub/sub wait queue)
├── cacher.ts       # Response cache middleware
├── counter.ts      # Auto-increment counter (MongoDB)
├── scanner.ts      # Auto-load routers/tasks/events
├── slack.ts        # Slack integration
├── telegram.ts     # Telegram integration
├── socket.ts       # WebSocket emitter via Redis pub/sub
├── gateway.ts      # API gateway utilities
└── query.ts        # Query parsing
dist/               # Compiled output (gitignored)
test/               # Test files (*.test.ts)
```

### Core Modules

| Module | Purpose |
|--------|---------|
| config | Zod schema config, top-level await, env vars |
| cardinal | App factory + lifecycle (boot, teardown) |
| logger | Structured JSON logging với log levels |
| tx | AsyncLocalStorage for request context (txid, req, res) |
| check | Assertion helpers với TypeScript asserts |
| vanguard | Auth middleware (detector + supervisor) |

### Peer Dependencies (Optional)

```bash
npm install mongoose   # For eroc/mongoose
npm install redis      # For eroc/redis, eroc/lock, eroc/cacher
npm install kafkajs    # For eroc/kafka, eroc/task
```

## Code Style

- Single quotes, no semicolons, trailing commas
- Print width: 120, tab width: 2
- ESM imports với `.js` extension trong source
- Prefer explicit types over inference

## Testing

Node.js native test runner:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('module', () => {
  it('should work', () => {
    assert.strictEqual(1 + 1, 2)
  })
})
```

Run: `yarn test` hoặc `node --import tsx --test 'test/**/*.test.ts'`
