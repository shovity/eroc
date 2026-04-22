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

// Lazy tx accessor to avoid circular dependency at module load time
let txModule: { tx: { get: (key: string) => unknown } } | undefined

async function getTxid(): Promise<string | undefined> {
  try {
    if (!txModule) {
      txModule = await import('./tx.js')
    }
    return txModule.tx.get('txid') as string | undefined
  } catch {
    return undefined
  }
}

export function createLogger(options: LoggerOptions = {}) {
  const { service = 'unknown', transporter = 'console:debug', output } = options
  const { level: minLevel } = parseTransporter(transporter)

  const write = output ?? ((str: string) => console.log(str))

  function log(level: LogLevel, message: string, payload?: Record<string, unknown>) {
    if (LEVELS[level] > LEVELS[minLevel]) return

    let txid: string | undefined
    try {
      // Access tx synchronously via already-loaded module to avoid async log calls
      if (txModule) {
        txid = txModule.tx.get('txid') as string | undefined
      }
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
