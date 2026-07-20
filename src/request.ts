import { config } from './config.js'
import { tx } from './tx.js'
import { internal } from './internal.js'

interface RequestOptions {
  headers?: Record<string, string>
  timeout?: number
}

async function doFetch<T>(method: string, url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const { headers = {}, timeout = 30000 } = options

  let fullUrl: string
  const extraHeaders: Record<string, string> = {}

  if (url.startsWith('http')) {
    fullUrl = url
  } else if (config.request_base) {
    fullUrl = `${config.request_base}${url}`
  } else {
    // Internal service call, e.g. 'user/in/verify' -> http://user:3000/user/in/verify.
    // Signed with HMAC so the callee can authenticate without a secret on the wire.
    const cleanPath = url.replace(/^\/+/, '')
    const service = cleanPath.split('/')[0]
    // Sign the path only (no query) — the callee rebuilds the same canonical path
    Object.assign(extraHeaders, internal.headers({ method, path: `/${cleanPath.split('?')[0]}` }))
    fullUrl = `http://${config.internal_request_base ?? service}:3000/${cleanPath}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-txid': tx.get<string>('txid') ?? '',
        ...extraHeaders,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      const error = new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`) as Error & {
        status: number
        body: string
      }
      error.status = response.status
      error.body = errorBody
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
    const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null)
    const searchParams = entries.length
      ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)] as [string, string])).toString()
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
