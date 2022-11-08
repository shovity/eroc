const phone = {}

phone.refine = (pn = '') => {
    pn = pn.replace(/[^0-9]/g, '')

    if (pn.startsWith('84')) {
        return `+${pn}`
    } else if (pn.startsWith('0')) {
        return `+84${pn.slice(1)}`
    }

    return pn
}

module.exports = phone
