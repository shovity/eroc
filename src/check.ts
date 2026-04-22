export interface CheckError extends Error {
  [key: string]: unknown
}

export function check(condition: unknown, message: string | Record<string, unknown>): asserts condition {
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

export function is<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

export function checkWith<E extends Error>(
  ErrorClass: new (message: string) => E,
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message)
  }
}
