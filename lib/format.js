// lib/format.js
// Money formatting, parsing and screen-reader phrasing. All amounts are shown in
// the user's currency symbol only — nothing is converted.

const formatters = new Map();

function formatter(code, fractionDigits) {
  const key = `${code}:${fractionDigits}`;
  if (!formatters.has(key)) {
    try {
      formatters.set(
        key,
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: code,
          currencyDisplay: 'narrowSymbol',
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        })
      );
    } catch {
      formatters.set(key, null);
    }
  }
  return formatters.get(key);
}

// formatMoney(2.5, 'USD') → "$2.50"; { trim: true } drops ".00" ("$180");
// { signed: true } prefixes "+" for earnings.
export function formatMoney(amount, code = 'USD', { trim = false, signed = false } = {}) {
  const value = Number.isFinite(amount) ? amount : 0;
  const digits = trim && Number.isInteger(Math.round(value * 100) / 100) ? 0 : 2;
  const f = formatter(code, digits);
  const text = f ? f.format(value) : `${code} ${value.toFixed(digits)}`;
  return signed && value >= 0 ? `+${text}` : text;
}

export function currencySymbol(code = 'USD') {
  const f = formatter(code, 0);
  try {
    return f?.formatToParts(0).find((p) => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

// Money fields accept "." or "," as the decimal separator. Returns NaN when empty/invalid.
export function parseMoney(text) {
  if (text == null) return NaN;
  const cleaned = String(text).trim().replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.' || cleaned === '-') {
    return NaN;
  }
  return Math.round(parseFloat(cleaned) * 100) / 100;
}

// Normalised 2-decimal string for a money field after blur ("1,5" → "1.50")
export function toMoneyInput(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '';
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  if (n < 1000) {
    return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100)}` : ''}`;
  }
  if (n < 1_000_000) {
    return `${numberWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${numberWords(n % 1000)}` : ''}`;
  }
  return String(n);
}

const UNITS = {
  USD: ['dollar', 'dollars'], CAD: ['dollar', 'dollars'], AUD: ['dollar', 'dollars'],
  NZD: ['dollar', 'dollars'], SGD: ['dollar', 'dollars'], HKD: ['dollar', 'dollars'],
  EUR: ['euro', 'euros'], GBP: ['pound', 'pounds'], INR: ['rupee', 'rupees'],
};

// Spec §7: money is read in full words — "two dollars fifty"
export function moneyToWords(amount, code = 'USD') {
  const unit = UNITS[code];
  const abs = Math.abs(Math.round((amount ?? 0) * 100));
  if (!unit) return formatMoney(amount, code);
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  const main = `${numberWords(whole)} ${whole === 1 ? unit[0] : unit[1]}`;
  return cents ? `${main} ${numberWords(cents)}` : main;
}

// "SUN · OCT 4"
export function formatHeaderDate(date = new Date()) {
  const day = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${day} · ${month} ${date.getDate()}`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export const monthName = (date = new Date()) => date.toLocaleDateString('en-US', { month: 'long' });

// "2026-09" → Date for the 1st of that month (local time)
export const monthKeyToDate = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
};

export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function isHttpUrl(text) {
  try {
    const u = new URL(String(text).trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Wishlist photo picked on this phone (see lib/itemPhotos.js) vs. a remote image link
export const isLocalImage = (value) => typeof value === 'string' && value.startsWith('local:');
