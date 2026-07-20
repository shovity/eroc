const config = require('./config')
const tx = require('./tx')
const internal = require('./internal')

const request = {}

request.fetch = ({ url, method, body, param, option }) => {
  option = Object.assign(
    {
      parse: 'json',
    },
    option,
  )

  const arg = {
    method,
    headers: {
      ...option.header,
      'x-txid': tx.get('txid') || '',
    },
    ...option,
  }

  const holder = {}

  if (option.timeout) {
    const controller = new AbortController()

    holder.timeout = setTimeout(() => controller.abort(), option.timeout)
    arg.signal = controller.signal
  }

  if (url.indexOf('http') !== 0) {
    // Internal service call. Exp: user/v1/users/token

    url = url.replace(/^\/+/g, '')

    const service = url.split('/')[0]

    // Sign the request so the callee can authenticate it without a shared
    // secret ever appearing on the wire. Path must match what vanguard rebuilds.
    Object.assign(arg.headers, internal.headers({ method, path: `/${url}` }))

    url = `http://${config.internal_request_base || service}:3000/${url}`
  }

  if (body) {
    if (option.formData) {
      delete arg.headers['Content-Type']
      arg.body = body
    } else {
      arg.headers['Content-Type'] = 'application/json'
      arg.body = JSON.stringify(body)
    }
  }

  if (param) {
    url +=
      (url.indexOf('?') !== 0 ? '?' : '&') +
      Object.keys(param)
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(param[k])}`)
        .join('&')
  }

  return fetch(url, arg)
    .then((res) => {
      return res[option.parse]()
    })
    .then((res) => {
      if (res.error) {
        return Promise.reject(res.error)
      }

      return Promise.resolve(res)
    })
    .finally(() => {
      if (holder.timeout) {
        clearTimeout(holder.timeout)
      }
    })
}

request.get = (url, param, option) => {
  return request.fetch({
    method: 'GET',
    url,
    param,
    option,
  })
}

request.post = (url, body, option) => {
  return request.fetch({
    method: 'POST',
    url,
    body,
    option,
  })
}

request.put = (url, body, option) => {
  return request.fetch({
    method: 'PUT',
    url,
    body,
    option,
  })
}

request.patch = (url, body, option) => {
  return request.fetch({
    method: 'PATCH',
    url,
    body,
    option,
  })
}

request.delete = (url, body, option) => {
  return request.fetch({
    method: 'DELETE',
    url,
    body,
    option,
  })
}

module.exports = request
