import { tx } from './tx.js'

type LogLevel = 'emerg' | 'alert' | 'crit' | 'error' | 'warn' | 'notice' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  service: string
  env?: string
  txid?: string
  uid?: string
  url?: string
  method?: string
  path?: string
  stack?: string
  payload?: Record<string, unknown>
}

interface LoggerOptions {
  service?: string
  transporter?: string
  appDir?: string
  output?: (str: string) => void
}

// Ordering specified by RFC5424
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

// Extract the app-relative source path from a stack trace, e.g. "routers/users"
function extractPath(stack: string | undefined, appDir: string): string | undefined {
  if (!stack || !appDir) return undefined
  try {
    for (const line of stack.split('at ')) {
      if (!line.includes(appDir) || line.includes('node_modules')) continue
      return line.split(`${appDir}/`).slice(1).join('').split('.')[0]
    }
  } catch {
    // best-effort only
  }
  return undefined
}

export function createLogger(options: LoggerOptions = {}) {
  const { service = 'unknown', transporter = 'console:debug', appDir = '', output } = options
  const { level: minLevel } = parseTransporter(transporter)

  const write = output ?? ((str: string) => console.log(str))

  function log(level: LogLevel, message: string | Error, payload?: Record<string, unknown> | Error) {
    if (LEVELS[level] > LEVELS[minLevel]) return

    let stack: string | undefined
    let normalizedMessage: string
    let normalizedPayload: Record<string, unknown> | undefined

    // Normalize Error passed as message or payload
    if (message instanceof Error) {
      stack = message.stack
      normalizedMessage = message.message
      normalizedPayload = payload instanceof Error ? { error: String(payload) } : payload
    } else {
      normalizedMessage = message
      if (payload instanceof Error) {
        stack = payload.stack
        normalizedPayload = { ...payload, message: payload.message }
      } else {
        normalizedPayload = payload
      }
    }

    const txid = tx.get<string>('txid')
    const uid = tx.get<string>('uid')
    const url = tx.get<string>('url')
    const method = tx.get<string>('method')
    const path = extractPath(stack ?? Error().stack, appDir)

    const entry: LogEntry = {
      level,
      message: normalizedMessage,
      timestamp: new Date().toISOString(),
      service,
      ...(txid && { txid }),
      ...(uid && { uid }),
      ...(url && { url }),
      ...(method && { method }),
      ...(path && { path }),
      ...(stack && { stack }),
      ...(normalizedPayload && { payload: normalizedPayload }),
    }

    write(JSON.stringify(entry))
  }

  return {
    emerg: (msg: string | Error, payload?: Record<string, unknown> | Error) => log('emerg', msg, payload),
    alert: (msg: string | Error, payload?: Record<string, unknown> | Error) => log('alert', msg, payload),
    crit: (msg: string | Error, payload?: Record<string, unknown> | Error) => log('crit', msg, payload),
    error: (msg: string | Error, payload?: Record<string, unknown> | Error) => log('error', msg, payload),
    warn: (msg: string | Error, payload?: Record<string, unknown> | Error) => log('warn', msg, payload),
    notice: (msg: string | Error, payload?: Record<string, unknown> | Error) => log('notice', msg, payload),
    info: (msg: string | Error, payload?: Record<string, unknown> | Error) => log('info', msg, payload),
    debug: (msg: string | Error, payload?: Record<string, unknown> | Error) => log('debug', msg, payload),
  }
}

// Default logger instance (re-initialized by cardinal with real config)
export let logger = createLogger()

export function initLogger(options: LoggerOptions): void {
  logger = createLogger(options)
}

export type Logger = ReturnType<typeof createLogger>
