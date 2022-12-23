const fetch = require('node-fetch')
const AbortController = require('abort-controller')

const config = require('./config')

const request = {
    setting: {
        header: {},
        base: config.request_base,
    },
}

const setting = request.setting

request.fetch = ({ url, method, body, param, option }) => {
    option = Object.assign(
        {
            // parse: 'json',
            // timeout: 30000,
            // formData: false,
            // header: {},
        },
        option,
    )

    const arg = {
        // defaut node-fetch option
        // https://www.npmjs.com/package/node-fetch#options

        method,
        headers: {
            ...setting.header,
            ...option.header,
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

        url = `http://${setting.base || service}:3000/${url}`
        arg.headers['client'] = config.client
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
            if (option.parse === 'text') {
                return res.text()
            }

            return res.json()
        })
        .then((res) => {
            if (res.error) {
                return Promise.reject(res.error)
            }

            return Promise.resolve(res)
        })
        .finally(() => {
            clearTimeout(holder.timeout)
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
