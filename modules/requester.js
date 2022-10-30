const fetch = require('node-fetch')
const AbortController = require('abort-controller')

const config = require('./config')


const requester = {
    setting: {
        header: {},
        base: config.requester_base,
    },
}

const setting = requester.setting


requester.fetch = ({ url, method, body, param, option }) => {

    option = Object.assign({
        // parse: 'json',
        // timeout: 30000,
        // formData: false,
        // header: {},
    }, option)
    
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
        url += (url.indexOf('?') !== 0? '?' : '&')
            + Object.keys(param).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(param[k])}`).join('&')
    }

    return fetch(url, arg).then((res) => {

        if (option.parse === 'text') {
            return res.text()
        }

        return res.json()
    }).then(res => {
        if (res.error) {
            return Promise.reject(res.error)
        }

        return Promise.resolve(res)
    }).finally(() => {
        clearTimeout(holder.timeout)
    })
}

requester.get = (url, param, option) => {

    return requester.fetch({
        method: 'GET',
        url,
        param,
        option,
    })
}

requester.post = (url, body, option) => {

    return requester.fetch({
        method: 'POST',
        url,
        body,
        option,
    })
}

requester.put = (url, body, option) => {
    
    return requester.fetch({
        method: 'PUT',
        url,
        body,
        option,
    })
}

requester.patch = (url, body, option) => {
    
    return requester.fetch({
        method: 'PATCH',
        url,
        body,
        option,
    })
}

requester.delete = (url, body, option) => {
    
    return requester.fetch({
        method: 'DELETE',
        url,
        body,
        option,
    })
}


module.exports = requester