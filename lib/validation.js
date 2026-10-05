// lib/validation.js
// Field rules + error copy from spec §5 (verbatim). Each returns an error string or null.
import { isHttpUrl, isLocalImage, parseMoney } from './format';

export const validate = {
  taskTitle: (v) => {
    const t = v.trim();
    if (!t) return 'Give your task a name.';
    if (t.length > 80) return 'Keep it under 80 characters.';
    return null;
  },
  taskValue: (v) => {
    const n = parseMoney(v);
    if (!Number.isFinite(n)) {
      return String(v).trim().startsWith('-') ? 'Amount can’t be negative.' : 'Enter an amount, like 1.50.';
    }
    if (n < 0) return 'Amount can’t be negative.';
    if (n > 999.99) return 'Enter an amount, like 1.50.';
    return null;
  },
  productUrl: (v, { required = false } = {}) => {
    const t = v.trim();
    if (!t) return required ? 'That doesn’t look like a link. It should start with https://' : null;
    return isHttpUrl(t) ? null : 'That doesn’t look like a link. It should start with https://';
  },
  itemName: (v) => {
    const t = v.trim();
    if (!t) return 'Give this item a name.';
    if (t.length > 100) return 'Keep it under 100 characters.';
    return null;
  },
  price: (v) => {
    const n = parseMoney(v);
    return Number.isFinite(n) && n > 0 ? null : 'Enter the price, like 89.99.';
  },
  // A picked photo ("local:…") or an http(s) image link
  imageUrl: (v) =>
    !v.trim() || isLocalImage(v) || isHttpUrl(v) ? null : 'That image link won’t work. Try another or leave it blank.',
  allowance: (v) => {
    const n = parseMoney(v);
    return Number.isFinite(n) && n >= 1 && n <= 10000 ? null : 'Enter a monthly amount, like 150.';
  },
};
