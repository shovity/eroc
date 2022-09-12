const string = {}

string.removeViAccent = (content) => {
    return content.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
}

string.separate = (value='', sign=',') => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, sign)
}


module.exports = string