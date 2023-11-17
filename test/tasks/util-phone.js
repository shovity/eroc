const { phoneU } = require('eroc/util')

test.start('phone util refine 1')
test.check('phone util refine 1', phoneU.refine('0399331235') === '+84399331235')

test.start('phone util refine 2')
test.check('phone util refine 2', phoneU.refine('+840399331235') === '+84399331235')

test.start('phone util refine 3')
test.check('phone util refine 3', phoneU.refine('00399331235') === '+84399331235')

test.start('phone util refine 4')
test.check('phone util refine 4', phoneU.refine('84399331235') === '+84399331235')

test.start('phone util refine 5')
test.check('phone util refine 5', phoneU.refine('840399331235') === '+84399331235')

test.start('phone util refine 6')
test.check('phone util refine 6', phoneU.refine('+84399331235') === '+84399331235')

test.start('phone util refine 7')
test.check('phone util refine 7', phoneU.refine('+85399331235') === '+85399331235')

test.start('phone util refine 8')
test.check('phone util refine 8', phoneU.refine('+84.399.331.235') === '+84399331235')

test.start('phone util refine 9')
test.check('phone util refine 9', phoneU.refine('+84-3993-312-35') === '+84399331235')
