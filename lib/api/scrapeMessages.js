// lib/api/scrapeMessages.js — spec §6.1. Shown at the top of the S9 manual form.
export const SCRAPE_MESSAGES = {
  blocked: {
    title: 'Couldn’t auto-fill this one',
    body: 'This store blocks automatic fetching. Add the details below — it only takes a moment.',
  },
  timeout: {
    title: 'The store took too long',
    body: 'Try “Fetch details” again, or add them yourself below.',
  },
  no_data: {
    title: 'No product details found',
    body: 'That page doesn’t list product info we can read. Add the details below.',
  },
  network_error: {
    title: 'You’re offline',
    body: 'Add the details yourself now. Fetching needs an internet connection.',
  },
  rate_limited: {
    title: 'Too many requests',
    body: 'Wait a minute and try again, or add the details yourself.',
  },
  // Not in the spec: the app was built without EXPO_PUBLIC_API_BASE
  not_configured: {
    title: 'Couldn’t auto-fill this one',
    body: 'Fetching from links isn’t set up in this build. Add the details below.',
  },
};

export const FALLBACK_MESSAGE = SCRAPE_MESSAGES.blocked;

// These come back as an inline error on the link field (S8), not a banner
export const INLINE_URL_ERRORS = new Set(['invalid_url', 'blocked_url']);
export const INLINE_URL_ERROR_COPY = 'That link can’t be used. Check it and try again.';
