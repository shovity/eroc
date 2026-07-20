# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan

`eroc` là một npm library (micro-framework bọc Express) cho microservices. Đây là code của library, không phải một app — "consuming app" là service cài `eroc` và gọi `create()`.

## Commands

- `yarn lint` — eslint --fix toàn repo
- `yarn format` — prettier --write toàn repo
- `yarn test` — chạy jest trên toàn bộ `*.spec.js` (nằm cạnh module, dùng jest defaults, không có file config)
- `yarn jest modules/jwt.spec.js` — chạy một file spec

## Kiến trúc

### Entry point lazy-load (index.js)

`module.exports` là một Proxy: truy cập `require('eroc').foo` sẽ tự `require('./modules/foo')` lần đầu. Thêm module mới = thêm file vào `modules/`, không cần đăng ký ở đâu cả.

`index.js` cũng định nghĩa **global `check(condition, message)`** — assertion throw error, được dùng khắp các module mà không cần require (đã khai báo trong `.eslintrc` globals).

### Boot flow (modules/cardinal.js)

`create()` trả về `{ app, server }` ngay, còn setup chạy async:

1. `boot()` — chờ `config.deferred.config`, kết nối Mongo (`mongo_uri`, retry) và Postgres (`postgres_uri`, fail-fast qua `modules/sequelize.js`), đăng ký teardown handlers.
2. Middleware chain: `tx.init()` (per-request context/txid) → `rio.*` (cors + decorate `res.success/error`, `req.u`, auth) → `health.router()` (k8s probes, bỏ qua auth) → `vanguard.detect()/supervise()` (authn/authz).
3. `seek()` — autoload theo convention từ thư mục của consuming app: `routers/`, `tasks/`, `events/`, `public/`, `static/`, `views/` (đường dẫn cấu hình qua `config.seek_*`, mount router dưới prefix `router_prefix || service`). Do `modules/scanner.js` thực hiện.
4. `migrate.run()` — auto-migrate Postgres schema trước khi nhận traffic.
5. 404 + error handler, rồi `server.listen`.

Hai deferred promise `config.deferred.config` / `config.deferred.setup` là tín hiệu readiness — code cần chạy sau setup thì await chúng.

Graceful shutdown: `cardinal.teardown(asyncFn)` đăng ký handler; SIGTERM/SIGINT/uncaughtException gọi `shutdown()` (chỉ khi `enable_teardown`, mặc định bật ở NODE_ENV=production).

### Config (modules/config.js)

Nguồn theo thứ tự: default trong file → `.env` ở cwd → hàm `config.js` của consuming app (nhận và mutate object config). Fail-fast `process.exit(1)` khi thiếu key bắt buộc: `JWT_PUBLIC_KEY` (nếu vanguard_detector có `token`), `JWT_PRIVATE_KEY` (nếu `jwt_signer`), `INTERNAL_HMAC_SECRET` (nếu vanguard_supervisor có `internal`).

### Các module chính

- `modules/Router.js` — bọc `express.Router`, tự `.catch(next)` cho async handler. Handler trong routers cứ viết async, lỗi throw sẽ rơi vào `cardinal.onError`.
- Error convention: message dạng `'Some message code:SOME_CODE'` sẽ được tách thành `{ message, code }` trong response.
- `modules/vanguard.js` — auth qua config: detectors (`token`, `cookie`, `client`) và supervisors (`internal`, `tiat`, `ui`, `login`).
- `modules/jwt.js` — RS256, tách access/refresh token theo claim `type`.
- `modules/internal.js` — HMAC-SHA256 cho HTTP nội bộ giữa các service (route `/in/*`).
- `modules/task.js` + `modules/kafka.js` — task queue trên Kafka, message ký HMAC (`kafka_hmac_secret`).
- `modules/event.js` — pub/sub qua Redis; `lock`, `counter`, `cacher` cũng dựa trên Redis.
- `util/` — helper thuần (phone, string, time, place), tách biệt với `modules/`.

## Style

- CommonJS (`require`/`module.exports`), không semicolon, single quote, printWidth 120 (prettier lo hết — chạy `yarn lint` là đủ).
- Log theo format `'<module>: message'` (ví dụ `'cardinal: 🍔 HTTP server ready!'`).
