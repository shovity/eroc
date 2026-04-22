import { config } from './config.js'

interface RequestOptions {
  headers?: Record<string, string>
  timeout?: number
}

async function doFetch<T>(method: string, url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const { headers = {}, timeout = 30000 } = options

  const fullUrl = url.startsWith('http') ? url : `${config.request_base ?? ''}${url}`

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
    const searchParams = params
      ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
      : ''
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
