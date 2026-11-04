import { domainOf, formatMoney, isHttpUrl, moneyToWords, parseMoney, toMoneyInput } from '../lib/format';

describe('formatMoney', () => {
  test('two decimals by default', () => {
    expect(formatMoney(2.5, 'USD')).toBe('$2.50');
  });

  test('trim drops .00 but keeps real cents', () => {
    expect(formatMoney(180, 'USD', { trim: true })).toBe('$180');
    expect(formatMoney(180.5, 'USD', { trim: true })).toBe('$180.50');
  });

  test('signed prefixes + for earnings only', () => {
    expect(formatMoney(2.5, 'USD', { signed: true })).toBe('+$2.50');
    expect(formatMoney(-2.5, 'USD', { signed: true })).toBe('-$2.50');
  });

  test('non-numbers render as zero rather than NaN', () => {
    expect(formatMoney(NaN, 'USD')).toBe('$0.00');
    expect(formatMoney(undefined, 'USD')).toBe('$0.00');
  });

  test('uses the narrow symbol for other currencies', () => {
    expect(formatMoney(89, 'EUR')).toBe('€89.00');
    expect(formatMoney(12, 'CAD')).toBe('$12.00');
  });
});

describe('parseMoney', () => {
  test.each([
    ['1.50', 1.5],
    ['1,5', 1.5],
    [' 3 ', 3],
    ['0', 0],
    ['.5', 0.5],
    ['2.345', 2.35],
    ['-2', -2],
  ])('%p → %p', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  test.each(['', '.', '-', 'abc', '1.2.3', '$5', null, undefined])('%p is not a number', (input) => {
    expect(parseMoney(input)).toBeNaN();
  });

  test('round-trips through the field formatter', () => {
    expect(toMoneyInput(parseMoney('1,5'))).toBe('1.50');
    expect(toMoneyInput(NaN)).toBe('');
  });
});

describe('moneyToWords', () => {
  test.each([
    [2.5, 'two dollars fifty'],
    [1, 'one dollar'],
    [0.05, 'zero dollars five'],
    [1234.05, 'one thousand two hundred thirty-four dollars five'],
    [21, 'twenty-one dollars'],
  ])('%p USD → %p', (amount, words) => {
    expect(moneyToWords(amount, 'USD')).toBe(words);
  });

  test('uses the currency’s unit name', () => {
    expect(moneyToWords(3, 'EUR')).toBe('three euros');
    expect(moneyToWords(1, 'GBP')).toBe('one pound');
  });

  test('falls back to the formatted amount for unnamed currencies', () => {
    expect(moneyToWords(5, 'JPY')).toBe(formatMoney(5, 'JPY'));
  });
});

describe('links', () => {
  test('only http(s) counts as a link', () => {
    expect(isHttpUrl('https://shop.example.com/item')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('ftp://example.com')).toBe(false);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('not a link')).toBe(false);
  });

  test('domainOf strips www', () => {
    expect(domainOf('https://www.example.com/a?b=c')).toBe('example.com');
    expect(domainOf('nope')).toBeNull();
  });
});
