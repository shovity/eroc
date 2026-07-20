// Unit test for phone.refine — normalises Vietnamese phone numbers to +84 E.164.
// Run: pnpm run test core/util/phone.spec.js

const phone = require('./phone')

describe('phone.refine', () => {
  test('converts a national 0-prefixed number to +84', () => {
    expect(phone.refine('0901234567')).toBe('+84901234567')
  })

  test('normalises a bare 84-prefixed number', () => {
    expect(phone.refine('84901234567')).toBe('+84901234567')
  })

  test('keeps an already +84 number canonical', () => {
    expect(phone.refine('+84901234567')).toBe('+84901234567')
  })

  test('collapses the redundant 0 after the country code (+840... -> +84...)', () => {
    expect(phone.refine('+840901234567')).toBe('+84901234567')
  })

  test('strips spaces, dashes and parentheses before normalising', () => {
    expect(phone.refine('090-123 4567')).toBe('+84901234567')
    expect(phone.refine('+84 (0)90 123 4567')).toBe('+84901234567')
  })

  test('drops a + that is not at the start', () => {
    expect(phone.refine('090+123')).toBe('+8490123')
  })

  test('returns an empty string for the empty/default input', () => {
    expect(phone.refine()).toBe('')
    expect(phone.refine('')).toBe('')
  })
})
