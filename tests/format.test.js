import { formatMoney, isHttpUrl, moneyToWords, parseMoney } from '../lib/format';
import { validate } from '../lib/validation';

describe('parseMoney', () => {
  test.each([
    ['1.50', 1.5],
    ['1,5', 1.5],
    [' 2 ', 2],
    ['.75', 0.75],
    ['0.125', 0.13],
  ])('%p → %p', (input, expected) => expect(parseMoney(input)).toBe(expected));

  test.each(['', '.', '-', 'abc', '1.2.3', null])('%p → NaN', (input) => {
    expect(parseMoney(input)).toBeNaN();
  });
});

describe('formatMoney', () => {
  test('two decimals by default', () => expect(formatMoney(2.5, 'USD')).toBe('$2.50'));
  test('trim drops .00', () => expect(formatMoney(180, 'USD', { trim: true })).toBe('$180'));
  test('signed earnings', () => expect(formatMoney(2.5, 'USD', { signed: true })).toBe('+$2.50'));
  test('bad input shows zero', () => expect(formatMoney(NaN, 'USD')).toBe('$0.00'));
});

describe('moneyToWords (screen readers)', () => {
  test('dollars and cents', () => expect(moneyToWords(2.5, 'USD')).toBe('two dollars fifty'));
  test('singular', () => expect(moneyToWords(1, 'CAD')).toBe('one dollar'));
  test('hundreds', () => expect(moneyToWords(349, 'EUR')).toBe('three hundred forty-nine euros'));
});

describe('validation copy', () => {
  test('task value', () => {
    expect(validate.taskValue('1.50')).toBeNull();
    expect(validate.taskValue('')).toBe('Enter an amount, like 1.50.');
    expect(validate.taskValue('-2')).toBe('Amount can’t be negative.');
    expect(validate.taskValue('1000')).toBe('Enter an amount, like 1.50.');
  });
  test('allowance range', () => {
    expect(validate.allowance('150')).toBeNull();
    expect(validate.allowance('0')).not.toBeNull();
    expect(validate.allowance('10001')).not.toBeNull();
  });
  test('links', () => {
    expect(isHttpUrl('https://example.com/x')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
  });
});
