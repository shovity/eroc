/**
 * * Transaction
 * Hold and handle transaction context
 * Each transaction start per request
 */

const { AsyncLocalStorage } = require('node:async_hooks')
const uuid = require('uuid')

const tx = {
    asyncLocalStorage: new AsyncLocalStorage()
}

tx.init = () => {
    return (req, res, next) => {
        tx.asyncLocalStorage.run(new Map(), () => {
            tx.set('txid', uuid.v4())
            tx.set('url', req.originalUrl)
            tx.set('method', req.method)
            
            next()
        })
    }
}

tx.get = (key) => {
    return tx.asyncLocalStorage.getStore()?.get(key)
}

tx.set = (key, value) => {
    const store = tx.asyncLocalStorage.getStore()
    check(store, 'TX Store has not been initialized')
    return tx.asyncLocalStorage.getStore()?.set(key, value)
}

module.exports = tx