// lib/currencies.js
// Currency only changes the symbol — amounts are never converted.
import { getLocales } from 'expo-localization';

export const CURRENCIES = [
  ['USD', 'US dollar'],
  ['CAD', 'Canadian dollar'],
  ['EUR', 'Euro'],
  ['GBP', 'British pound'],
  ['AUD', 'Australian dollar'],
  ['NZD', 'New Zealand dollar'],
  ['INR', 'Indian rupee'],
  ['JPY', 'Japanese yen'],
  ['CNY', 'Chinese yuan'],
  ['HKD', 'Hong Kong dollar'],
  ['SGD', 'Singapore dollar'],
  ['KRW', 'South Korean won'],
  ['PHP', 'Philippine peso'],
  ['MXN', 'Mexican peso'],
  ['BRL', 'Brazilian real'],
  ['CHF', 'Swiss franc'],
  ['SEK', 'Swedish krona'],
  ['NOK', 'Norwegian krone'],
  ['DKK', 'Danish krone'],
  ['PLN', 'Polish złoty'],
  ['ZAR', 'South African rand'],
  ['NGN', 'Nigerian naira'],
  ['KES', 'Kenyan shilling'],
  ['AED', 'UAE dirham'],
  ['SAR', 'Saudi riyal'],
  ['TRY', 'Turkish lira'],
  ['ILS', 'Israeli new shekel'],
  ['PKR', 'Pakistani rupee'],
  ['BDT', 'Bangladeshi taka'],
  ['IDR', 'Indonesian rupiah'],
  ['MYR', 'Malaysian ringgit'],
  ['THB', 'Thai baht'],
  ['VND', 'Vietnamese đồng'],
].map(([code, name]) => ({ code, name }));

const KNOWN = new Set(CURRENCIES.map((c) => c.code));

// Spec: default currency from the device locale when the user hasn't chosen one
export function deviceCurrency() {
  try {
    const code = getLocales()[0]?.currencyCode;
    return code && KNOWN.has(code) ? code : 'USD';
  } catch {
    return 'USD';
  }
}
