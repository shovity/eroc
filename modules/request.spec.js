// Unit test for the request module — the internal HTTP client. Focus on how it
// builds the outgoing fetch call: internal vs external URL resolution, the txid
// and internal-signature headers, query encoding, body handling, and error
// rejection. fetch/tx/internal are mocked so nothing leaves the process.
// Run: pnpm run test core/modules/request.spec.js

const mockConfig = {}
jest.mock('./config', () => mockConfig)
jest.mock('./tx', () => ({ get: jest.fn(() => 'txid-123') }))
jest.mock('./internal', () => ({ headers: jest.fn(() => ({ 'x-internal-sig': 'sig' })) }))

const request = require('./request')

// Drive fetch's resolved value and capture the (url, arg) it was called with.
const mockFetch = (body = { ok: true }) => {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve(body) }))
}

beforeEach(() => {
  mockFetch()
  delete mockConfig.internal_request_base
})

const lastCall = () => global.fetch.mock.calls[0]

describe('request — internal service calls', () => {
  test('resolves a bare path to the in-cluster service URL', async () => {
    await request.get('user/in/verify')
    expect(lastCall()[0]).toBe('http://user:3000/user/in/verify')
  })

  test('strips leading slashes before resolving the service', async () => {
    await request.get('/user/in/verify')
    expect(lastCall()[0]).toBe('http://user:3000/user/in/verify')
  })

  test('attaches the internal signature and txid headers', async () => {
    await request.get('user/in/verify')
    const { headers } = lastCall()[1]

    expect(headers['x-internal-sig']).toBe('sig')
    expect(headers['x-txid']).toBe('txid-123')
  })

  test('honours config.internal_request_base as the host override', async () => {
    mockConfig.internal_request_base = 'gateway'
    await request.get('user/in/verify')
    expect(lastCall()[0]).toBe('http://gateway:3000/user/in/verify')
  })
})

describe('request — external calls', () => {
  test('leaves an absolute http(s) URL untouched and adds no internal signature', async () => {
    await request.get('https://api.example/data')
    const [url, arg] = lastCall()

    expect(url).toBe('https://api.example/data')
    expect(arg.headers['x-internal-sig']).toBeUndefined()
    expect(arg.headers['x-txid']).toBe('txid-123')
  })
})

describe('request — query params', () => {
  test('appends and URL-encodes query params', async () => {
    await request.get('https://api.example/search', { q: 'a b&c', page: 2 })
    expect(lastCall()[0]).toBe('https://api.example/search?q=a%20b%26c&page=2')
  })
})

describe('request — body handling', () => {
  test('JSON-encodes a body and sets the Content-Type', async () => {
    await request.post('user/in/create', { name: 'John' })
    const { headers, body } = lastCall()[1]

    expect(headers['Content-Type']).toBe('application/json')
    expect(body).toBe(JSON.stringify({ name: 'John' }))
  })

  test('sends formData raw and drops the Content-Type so fetch sets the boundary', async () => {
    const form = { append: () => {} } // stand-in for FormData
    await request.fetch({ method: 'POST', url: 'file/in/upload', body: form, option: { formData: true } })
    const { headers, body } = lastCall()[1]

    expect(body).toBe(form)
    expect(headers['Content-Type']).toBeUndefined()
  })
})

describe('request — method mapping', () => {
  test.each([
    ['get', 'GET'],
    ['post', 'POST'],
    ['put', 'PUT'],
    ['patch', 'PATCH'],
    ['delete', 'DELETE'],
  ])('request.%s issues a %s', async (verb, method) => {
    await request[verb]('https://api.example/x')
    expect(lastCall()[1].method).toBe(method)
  })
})

describe('request — error propagation', () => {
  test('rejects with the error field when the response carries one', async () => {
    mockFetch({ error: 'user_not_found' })
    await expect(request.get('user/in/verify')).rejects.toBe('user_not_found')
  })

  test('resolves with the parsed body on success', async () => {
    mockFetch({ data: { id: 1 } })
    await expect(request.get('user/in/verify')).resolves.toEqual({ data: { id: 1 } })
  })
})

describe('request — timeout', () => {
  test('wires an AbortSignal when a timeout is given', async () => {
    await request.get('https://api.example/x', null, { timeout: 5000 })
    expect(lastCall()[1].signal).toBeInstanceOf(AbortSignal)
  })
})
