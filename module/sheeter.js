/**
 * https://theoephraim.github.io/node-google-spreadsheet
 */

const { GoogleSpreadsheet } = require('google-spreadsheet')

const config = require('./config')


check(config.sheeter_credentials, 'Missing config.sheeter_credentials')

const sheeter = {

    setting: {
        credentials: JSON.parse(config.sheeter_credentials || '{}')
    },
}

const setting = sheeter.setting

sheeter.doc = async (id) => {

    if (id.indexOf('spreadsheets/d/') !== -1) {
        id = id.split('spreadsheets/d/')[1].split('/')[0]
    }

    const doc = new GoogleSpreadsheet(id)

    await doc.useServiceAccountAuth(setting.credentials)
    await doc.loadInfo()

    return doc
}


module.exports = sheeter