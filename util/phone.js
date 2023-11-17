const phone = {}

phone.refine = (pn = '') => {
    pn = pn
        .replace(/[^0-9+]/g, '')
        .replace(/\+/g, (match, offset) => (offset === 0 ? match : ''))

    if (pn.startsWith('84')) {
        return `+84${pn.slice(2).replace(/^0+/, '')}`
    }

    if (pn.startsWith('+84')) {
        return `+84${pn.slice(3).replace(/^0+/, '')}`
    }
    
    if (pn.startsWith('0')) {
        return `+84${pn.replace(/^0+/, '')}`
    }

    return pn
}

module.exports = phone
