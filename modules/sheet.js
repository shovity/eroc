const { GoogleSpreadsheet } = require('google-spreadsheet')
const config = require('./config')

check(config.sheet_credential, 'Missing config.sheet_credential')

const sheet = {}

sheet.doc = async (id) => {
    if (id.indexOf('spreadsheets/d/') !== -1) {
        id = id.split('spreadsheets/d/')[1].split('/')[0]
    }

    const doc = new GoogleSpreadsheet(id)

    await doc.useServiceAccountAuth(config.sheet_credential)
    await doc.loadInfo()

    return doc
}

module.exports = sheet
