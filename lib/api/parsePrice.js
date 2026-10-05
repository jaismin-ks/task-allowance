// lib/api/parsePrice.js — same rules as the server's lib/extract.js parsePrice
// "$1,299.99" → 1299.99, "1.299,99 €" → 1299.99, "19,99" → 19.99
export function parsePrice(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/[^\d.,]/g, '');
  if (!s) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal point
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    // Lone comma: decimal if followed by exactly 2 digits at the end, else thousands
    s = /,\d{2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

const SYMBOL_CURRENCY = { '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' }; // '$' is ambiguous

export function currencyFromSymbol(raw) {
  if (!raw) return null;
  return Object.entries(SYMBOL_CURRENCY).find(([sym]) => String(raw).includes(sym))?.[1] ?? null;
}
