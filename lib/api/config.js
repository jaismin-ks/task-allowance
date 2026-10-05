// lib/api/config.js
// Set in .env.local (dev) or EAS env (builds). EXPO_PUBLIC_ vars are inlined at build time —
// never put secrets in them; the API keys live on the server.
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE?.replace(/\/$/, '') ?? null;
