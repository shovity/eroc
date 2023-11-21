const util = require('eroc/util/string')

test.start('util.string removeViAccent')
test.check('util.string removeViAccent', util.removeViAccent('ÀÁÃẢẠĂằắẳẵặâ') === 'AAAAAAaaaaaa')

test.start('util.string separate')
test.check('util.string separate', util.separate(100000) === '100,000')
