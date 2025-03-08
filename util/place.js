const util = {}

const FILTER_REGEX = /tỉnh|thành phố|tp\.|quận|huyện|phường|xã|tx\.|thị xã|đ\./gi

util.refine = (place) => {
  if (!place) {
    return place
  }

  if (typeof place === 'string') {
    place = JSON.parse(place)
  }

  const formatted = place.formatted_address || place.description

  if (formatted) {
    place.components = formatted
      .split(',')
      .map((c) => c.replace(FILTER_REGEX, '').trim().toLowerCase())
      .filter(Boolean)
      .reverse()
  }

  if (place.geometry?.location) {
    place.location = {
      type: 'Point',
      coordinates: [place.geometry.location.lng, place.geometry.location.lat],
    }
  }

  return place
}

module.exports = util
