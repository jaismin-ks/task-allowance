// lib/api/scrapeProduct.js
import { API_BASE } from './config';

const CLIENT_TIMEOUT_MS = 12000; // server gives up at 6s per fetch; leave headroom

// Always resolves — failures come back as { success: false, reason } so the
// UI can drop straight into manual entry instead of hitting a dead end.
export async function scrapeProduct(url) {
  if (!API_BASE) return { success: false, reason: 'not_configured' };

  // AbortSignal.timeout() isn't reliably available in React Native — use a timer
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/api/scrape-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    if (res.status === 429) return { success: false, reason: 'rate_limited' };
    if (res.status === 400) return { success: false, reason: 'invalid_url' };
    return await res.json();
  } catch {
    return { success: false, reason: 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}
