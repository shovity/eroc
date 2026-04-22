# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**eroc** là Express wrapper framework cung cấp batteries-included cho Node.js services. Modules được lazy-load qua Proxy pattern - chỉ load khi được gọi lần đầu.

## Commands

```bash
yarn lint          # ESLint + auto-fix
yarn format        # Prettier
yarn test          # Chạy integration tests (cần Docker)
```

Test yêu cầu Docker Compose, tự động spin up Kafka, MongoDB, Redis, Zookeeper.

## Architecture

### Entry Point
`index.js` exports một Proxy auto-load modules từ `modules/` khi được access:
```js
const { create, config, logger } = require('eroc')
```

### Core Module: cardinal.js
Module trung tâm xử lý:
- Tạo Express app + HTTP server
- Boot sequence: connect DB → apply middlewares → seek resources → start server
- Auto-seek routers từ `seek_routers` directory
- Auto-load events và tasks
- Graceful shutdown với teardown handlers

### Key Modules
| Module | Requires | Purpose |
|--------|----------|---------|
| config | - | Centralized config, merge từ config.js < config.override.js < redis |
| cardinal | - | App factory + lifecycle management |
| mongoose | mongo_uri | MongoDB ODM wrapper |
| redis | redis_uri | Redis client wrapper |
| task | kafka_broker | Kafka-based async tasks |
| vanguard | - | Auth/authz middleware (detector + supervisor) |
| cacher | redis_uri | Response caching middleware |
| logger | - | Structured logging với transporter |

### Config Priority
`config.js` → `config.override.js` → Redis key `eroc:service` (centralized)

### Auto-seek Directories
Khi `create()`, cardinal tự động scan và load từ working directory:
- `routers/` - Express routers (auto-mount với prefix)
- `tasks/` - Kafka task handlers
- `events/` - Event handlers

## Code Style

- Single quotes, no semicolons, trailing commas
- Print width: 120, tab width: 2
- Global `check(condition, message)` - assertion helper, throws Error nếu condition false
- Unused vars prefix với `_` hoặc tên `next` được allow

## Testing

Test framework tự implement (`test/test.js`), không dùng external lib:
```js
test.start('test name')      // Bắt đầu test case
test.check('test name', condition)  // Pass/fail assertion
```
