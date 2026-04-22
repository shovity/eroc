export const util = {
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },

  deferred<T>(): PromiseWithResolvers<T> {
    return Promise.withResolvers<T>()
  },

  throttle<T extends (...args: unknown[]) => unknown>(fn: T, wait: number): (...args: Parameters<T>) => void {
    let lastCall = 0
    return (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCall >= wait) {
        lastCall = now
        fn(...args)
      }
    }
  },

  debounce<T extends (...args: unknown[]) => unknown>(fn: T, wait: number): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null
    return (...args: Parameters<T>) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fn(...args), wait)
    }
  },

  intersect<T extends object>(target: T, source: Partial<T>): T {
    const result = { ...target }
    for (const key of Object.keys(source) as Array<keyof T>) {
      if (key in target && source[key] !== undefined) {
        result[key] = source[key] as T[keyof T]
      }
    }
    return result
  },
}

export type Util = typeof util
