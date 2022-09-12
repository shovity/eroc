const util = {}

util.refine = (place) => {

    if (!place) {
        return place
    }

    if (typeof place === 'string') {
        place = JSON.parse(place)
    }

    if (place.address_components) {

        place.address_components = place.address_components.filter((c) => {
            
            if (c.types.includes('postal_code')) {
                return
            }

            return true
        })

        place.components = place.address_components
            .map((c) => {
                return c.long_name.replace(/tỉnh|thành phố|tp\.|quận|huyện|phường|xã|tx\.|thị xã/gi, '').trim()
            })
            .reverse()
    }
    
    return place
}


module.exports = util